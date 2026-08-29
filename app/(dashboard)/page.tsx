'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKas } from '@/lib/context/KasContext'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import type { Transaction, Event } from '@/types'
import { TrendingUp, TrendingDown, Wallet, CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

export default function DashboardPage() {
  const supabase = createClient()
  const { activeKas } = useKas()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [eventStats, setEventStats] = useState<Record<string, { collected: number; target: number; count: number }>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!activeKas) return
    setLoading(true)

    const [txRes, evRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('organization_id', activeKas.id).order('date', { ascending: false }),
      supabase.from('events').select('*').eq('organization_id', activeKas.id).eq('status', 'active').order('created_at', { ascending: false }),
    ])

    const txs = (txRes.data ?? []) as Transaction[]
    const evs = (evRes.data ?? []) as Event[]
    setTransactions(txs)
    setEvents(evs)

    // Load event stats
    const stats: Record<string, { collected: number; target: number; count: number }> = {}
    for (const ev of evs) {
      const { data: participants } = await supabase
        .from('event_participants')
        .select('id, payment_status')
        .eq('event_id', ev.id)

      const pIds = (participants ?? []).map(p => p.id)
      let collected = 0
      if (pIds.length > 0) {
        const { data: installments } = await supabase
          .from('installments')
          .select('amount')
          .in('participant_id', pIds)
        collected = (installments ?? []).reduce((s, i) => s + Number(i.amount), 0)
      }
      stats[ev.id] = {
        collected,
        target: ev.target_amount_per_person * (participants?.length ?? 0),
        count: participants?.length ?? 0,
      }
    }
    setEventStats(stats)
    setLoading(false)
  }, [activeKas])

  useEffect(() => { load() }, [load])

  // Computed
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  const now = new Date()
  const monthlyIncome = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear()).reduce((s, t) => s + Number(t.amount), 0)
  const monthlyExpense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear()).reduce((s, t) => s + Number(t.amount), 0)

  // Chart data (6 months)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const m = d.getMonth(), y = d.getFullYear()
    const income = transactions.filter(t => t.type === 'income' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + Number(t.amount), 0)
    const expense = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === m && new Date(t.date).getFullYear() === y).reduce((s, t) => s + Number(t.amount), 0)
    return { name: MONTHS[m], income, expense }
  })

  const recentTx = transactions.slice(0, 5)

  if (!activeKas) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4">🏦</div>
          <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Belum ada kas</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Buat kas baru melalui menu di sidebar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{activeKas.name}{activeKas.description ? ` — ${activeKas.description}` : ''}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Saldo */}
        <div className="glass rounded-2xl p-5 col-span-1" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>TOTAL SALDO</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <Wallet size={15} style={{ color: '#818cf8' }} />
            </div>
          </div>
          {loading ? <div className="skeleton h-7 w-32 mb-1" /> : (
            <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: balance >= 0 ? '#a5b4fc' : '#f87171' }}>{formatRupiah(balance)}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Saldo keseluruhan kas</p>
        </div>

        {/* Pemasukan bulan ini */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>PEMASUKAN BULAN INI</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <TrendingUp size={15} style={{ color: '#4ade80' }} />
            </div>
          </div>
          {loading ? <div className="skeleton h-7 w-28 mb-1" /> : (
            <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#4ade80' }}>{formatRupiah(monthlyIncome)}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
        </div>

        {/* Pengeluaran bulan ini */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>PENGELUARAN BULAN INI</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
              <TrendingDown size={15} style={{ color: '#f87171' }} />
            </div>
          </div>
          {loading ? <div className="skeleton h-7 w-28 mb-1" /> : (
            <p className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#f87171' }}>{formatRupiah(monthlyExpense)}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Chart */}
        <div className="glass rounded-2xl p-5 lg:col-span-3">
          <h2 className="text-sm font-bold mb-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Arus Kas 6 Bulan Terakhir</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
              <Tooltip
                contentStyle={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(val: any, name: any) => [formatRupiah(Number(val ?? 0)), name === 'income' ? 'Pemasukan' : 'Pengeluaran']}
              />
              <Bar dataKey="income" fill="#6366f1" radius={[4,4,0,0]} maxBarSize={28} />
              <Bar dataKey="expense" fill="#a855f7" radius={[4,4,0,0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6366f1' }} />Pemasukan</div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#a855f7' }} />Pengeluaran</div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Transaksi Terbaru</h2>
            <Link href="/transactions" className="text-xs" style={{ color: '#818cf8' }}>Lihat semua</Link>
          </div>
          <div className="space-y-2">
            {loading && [1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
            {!loading && recentTx.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada transaksi</p>
            )}
            {!loading && recentTx.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tx.type === 'income' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
                  {tx.type === 'income'
                    ? <ArrowUpRight size={14} style={{ color: '#4ade80' }} />
                    : <ArrowDownRight size={14} style={{ color: '#f87171' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description || tx.category || '-'}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatDateShort(tx.date)}</p>
                </div>
                <p className="text-sm font-semibold flex-shrink-0" style={{ color: tx.type === 'income' ? '#4ade80' : '#f87171' }}>
                  {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Events */}
      {events.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Event Aktif</h2>
            <Link href="/events" className="text-xs" style={{ color: '#818cf8' }}>Lihat semua</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map(ev => {
              const stat = eventStats[ev.id] ?? { collected: 0, target: 0, count: 0 }
              const pct = stat.target > 0 ? Math.min((stat.collected / stat.target) * 100, 100) : 0
              return (
                <Link key={ev.id} href={`/events/${ev.id}`} className="p-4 rounded-xl transition-all hover:bg-white/5 block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays size={14} style={{ color: '#818cf8' }} />
                    <p className="text-sm font-semibold truncate">{ev.name}</p>
                  </div>
                  <div className="progress-track mb-2">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <span>{formatRupiah(stat.collected)}</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{stat.count} peserta</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
