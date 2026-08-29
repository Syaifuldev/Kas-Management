'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKas } from '@/lib/context/KasContext'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'
import { exportTransactionsPDF, downloadTransactionsTemplate, parseExcel } from '@/lib/exportUtils'
import {
  Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Pencil, Trash2, X, Loader2, Search, FileDown, FileUp
} from 'lucide-react'
import { toast } from 'sonner'
import React from 'react'

const CATEGORIES_INCOME = ['Iuran', 'Donasi', 'Infaq', 'Transfer', 'Lainnya']
const CATEGORIES_EXPENSE = ['Konsumsi', 'Transport', 'Perlengkapan', 'Administrasi', 'Lainnya']

interface FormData {
  type: 'income' | 'expense'
  amount: string
  category: string
  description: string
  date: string
}

const defaultForm: FormData = { type: 'income', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] }

export default function TransactionsPage() {
  const supabase = createClient()
  const { activeKas } = useKas()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')

  // Import State
  const [importing, setImporting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!activeKas) return
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', activeKas.id)
      .order('date', { ascending: false })
    setTransactions((data ?? []) as Transaction[])
    setLoading(false)
  }, [activeKas])

  useEffect(() => { load() }, [load])

  const openAdd = (type: 'income' | 'expense') => {
    setEditTx(null)
    setForm({ ...defaultForm, type })
    setShowModal(true)
  }

  const openEdit = (tx: Transaction) => {
    setEditTx(tx)
    setForm({ type: tx.type, amount: String(tx.amount), category: tx.category ?? '', description: tx.description ?? '', date: tx.date })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeKas) return
    setSaving(true)
    const payload = { type: form.type, amount: parseFloat(form.amount), category: form.category || null, description: form.description || null, date: form.date, organization_id: activeKas.id }

    if (editTx) {
      const { error } = await supabase.from('transactions').update(payload).eq('id', editTx.id)
      if (error) toast.error('Gagal mengupdate: ' + error.message)
      else { toast.success('Transaksi berhasil diupdate!'); setShowModal(false); load() }
    } else {
      const { error } = await supabase.from('transactions').insert(payload)
      if (error) toast.error('Gagal menyimpan: ' + error.message)
      else { toast.success('Transaksi berhasil disimpan!'); setShowModal(false); load() }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) toast.error('Gagal menghapus')
    else { toast.success('Transaksi dihapus'); load() }
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !search || (t.description ?? '').toLowerCase().includes(search.toLowerCase()) || (t.category ?? '').toLowerCase().includes(search.toLowerCase()))

  const handleExportPDF = () => {
    if (!activeKas) return
    exportTransactionsPDF(filtered, activeKas.name)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeKas) return

    setImporting(true)
    try {
      const data = await parseExcel(file)
      if (!data || data.length === 0) {
        toast.error('File Excel kosong atau format salah')
        setImporting(false)
        return
      }

      // Format data for insert
      const rowsToInsert = data
        .filter(row => row.type && row.amount && row.date && row.description !== 'HAPUS BARIS CONTOH INI SEBELUM IMPORT')
        .map(row => ({
          organization_id: activeKas.id,
          type: row.type === 'income' || row.type === 'expense' ? row.type : 'income',
          amount: parseFloat(row.amount),
          category: row.category || null,
          description: row.description || null,
          date: row.date
        }))

      if (rowsToInsert.length === 0) {
        toast.error('Tidak ada data valid untuk diimport')
        setImporting(false)
        return
      }

      const { error } = await supabase.from('transactions').insert(rowsToInsert)
      
      if (error) throw error
      
      toast.success(`${rowsToInsert.length} transaksi berhasil diimport!`)
      load()
    } catch (err: any) {
      toast.error('Gagal import: ' + err.message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const cats = form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Buku Kas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{activeKas?.name ?? '-'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportPDF} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1">
            <FileDown size={14} /> PDF
          </button>
          
          <div className="relative group">
            <button className="btn-secondary text-sm py-2 px-3 flex items-center gap-1">
              <FileUp size={14} /> Import Excel
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl glass border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={downloadTransactionsTemplate} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                1. Download Template
              </button>
              <label className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {importing ? '2. Mengimpor...' : '2. Upload File Excel'}
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} ref={fileInputRef} disabled={importing} />
              </label>
            </div>
          </div>

          <button className="btn-secondary text-sm py-2 px-3 hidden sm:flex" onClick={() => openAdd('expense')}>
            <ArrowDownRight size={14} style={{ color: '#f87171' }} /> Pengeluaran
          </button>
          <button className="btn-primary text-sm py-2 px-3 ml-auto sm:ml-0" onClick={() => openAdd('income')}>
            <Plus size={14} /> Pemasukan
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Saldo</p>
          <p className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: balance >= 0 ? '#a5b4fc' : '#f87171' }}>{formatRupiah(balance)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Masuk</p>
          <p className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#4ade80' }}>{formatRupiah(totalIncome)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Keluar</p>
          <p className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#f87171' }}>{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input className="input-base pl-9 py-2 text-sm" placeholder="Cari transaksi..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={filter === f ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontWeight: 600 } : { color: 'rgba(255,255,255,0.4)' }}>
              {f === 'all' ? 'Semua' : f === 'income' ? 'Masuk' : 'Keluar'}
            </button>
          ))}
        </div>
        <button className="btn-secondary text-sm py-2 px-3 sm:hidden" onClick={() => openAdd('expense')}>
          <ArrowDownRight size={14} style={{ color: '#f87171' }} /> Keluar
        </button>
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading && [1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-16 mx-4 my-3 rounded-xl" />)}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">📒</div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Belum ada transaksi</p>
          </div>
        )}
        {!loading && filtered.map((tx, idx) => (
          <div key={tx.id}
            className="flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-white/5"
            style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: tx.type === 'income' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}>
              {tx.type === 'income'
                ? <TrendingUp size={15} style={{ color: '#4ade80' }} />
                : <TrendingDown size={15} style={{ color: '#f87171' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description || '-'}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {tx.category && <span className="mr-2">{tx.category}</span>}{formatDate(tx.date)}
              </p>
            </div>
            <p className="text-sm font-bold flex-shrink-0 mr-2" style={{ color: tx.type === 'income' ? '#4ade80' : '#f87171' }}>
              {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
            </p>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}><Pencil size={13} /></button>
              <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-content p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                {editTx ? 'Edit Transaksi' : form.type === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              {!editTx && (
                <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(['income', 'expense'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={form.type === t ? { background: t === 'income' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: t === 'income' ? '#4ade80' : '#f87171' } : { color: 'rgba(255,255,255,0.4)' }}>
                      {t === 'income' ? '+ Pemasukan' : '- Pengeluaran'}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Nominal *</label>
                <input type="number" className="input-base" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required min="1" />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Kategori</label>
                <select className="input-base" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Pilih kategori</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Keterangan</label>
                <input type="text" className="input-base" placeholder="Deskripsi transaksi..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Tanggal *</label>
                <input type="date" className="input-base" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                  {editTx ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
