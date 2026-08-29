'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate, getPaymentStatusLabel } from '@/lib/utils'
import type { Event, EventParticipant, Installment } from '@/types'
import { exportParticipantsPDF, downloadParticipantsTemplate, parseExcel } from '@/lib/exportUtils'
import {
  ArrowLeft, Plus, Trash2, Pencil, X, Loader2, ChevronDown,
  ChevronUp, CalendarDays, Users, Wallet, CheckCircle2, Clock, AlertCircle,
  FileDown, FileUp
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ParticipantWithData extends EventParticipant {
  installments: Installment[]
  totalPaid: number
  remaining: number
  activeTarget: number
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'paid': return { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
    case 'partial': return { background: 'rgba(234,179,8,0.15)', color: '#facc15', border: '1px solid rgba(234,179,8,0.2)' }
    default: return { background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'paid': return <CheckCircle2 size={9} />
    case 'partial': return <Clock size={9} />
    default: return <AlertCircle size={9} />
  }
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Participant modal
  const [showParticipantModal, setShowParticipantModal] = useState(false)
  const [editParticipant, setEditParticipant] = useState<EventParticipant | null>(null)
  const [participantName, setParticipantName] = useState('')
  const [participantTarget, setParticipantTarget] = useState('')
  const [savingParticipant, setSavingParticipant] = useState(false)

  // Installment modal
  const [showInstallmentModal, setShowInstallmentModal] = useState(false)
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null)
  const [editInstallment, setEditInstallment] = useState<Installment | null>(null)
  const [installmentForm, setInstallmentForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
  const [savingInstallment, setSavingInstallment] = useState(false)

  // Import State
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single()
    if (!ev) { router.push('/events'); return }
    setEvent(ev as Event)

    const { data: parts } = await supabase.from('event_participants').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
    const partsList = (parts ?? []) as EventParticipant[]

    const enriched: ParticipantWithData[] = await Promise.all(
      partsList.map(async (p) => {
        const { data: installs } = await supabase.from('installments').select('*').eq('participant_id', p.id).order('payment_date', { ascending: true })
        const installments = (installs ?? []) as Installment[]
        const totalPaid = installments.reduce((s, i) => s + Number(i.amount), 0)
        return { ...p, installments, totalPaid, remaining: 0, activeTarget: 0 }
      })
    )
    // Compute remaining after we have event target
    const withRemaining = enriched.map(p => {
      const activeTarget = p.target_amount ?? (ev as Event).target_amount_per_person
      return {
        ...p,
        activeTarget,
        remaining: Math.max(0, activeTarget - p.totalPaid)
      }
    })
    setParticipants(withRemaining)
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])

  // Auto-update participant payment_status
  const updatePaymentStatus = async (participantId: string, totalPaid: number, target: number) => {
    let status: 'unpaid' | 'partial' | 'paid' = 'unpaid'
    if (totalPaid >= target) status = 'paid'
    else if (totalPaid > 0) status = 'partial'
    await supabase.from('event_participants').update({ payment_status: status }).eq('id', participantId)
  }

  // Participant CRUD
  const openAddParticipant = () => { setEditParticipant(null); setParticipantName(''); setParticipantTarget(''); setShowParticipantModal(true) }
  const openEditParticipant = (p: EventParticipant) => { setEditParticipant(p); setParticipantName(p.name); setParticipantTarget(p.target_amount ? String(p.target_amount) : ''); setShowParticipantModal(true) }

  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!participantName.trim()) return
    setSavingParticipant(true)
    const targetAmt = participantTarget ? parseFloat(participantTarget) : null
    
    if (editParticipant) {
      const { error } = await supabase.from('event_participants').update({ name: participantName.trim(), target_amount: targetAmt }).eq('id', editParticipant.id)
      if (error) toast.error('Gagal update: ' + error.message)
      else { 
        toast.success('Peserta diupdate!')
        
        // Recalculate status based on new target if there are installments
        const { data: allInstalls } = await supabase.from('installments').select('amount').eq('participant_id', editParticipant.id)
        const total = (allInstalls ?? []).reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0)
        await updatePaymentStatus(editParticipant.id, total, targetAmt ?? event!.target_amount_per_person)
        
        setShowParticipantModal(false)
        load() 
      }
    } else {
      const { error } = await supabase.from('event_participants').insert({ event_id: eventId, name: participantName.trim(), target_amount: targetAmt })
      if (error) toast.error('Gagal menambah peserta: ' + error.message)
      else { toast.success(`${participantName} ditambahkan!`); setShowParticipantModal(false); load() }
    }
    setSavingParticipant(false)
  }

  const handleDeleteParticipant = async (id: string, name: string) => {
    if (!confirm(`Hapus peserta "${name}"? Riwayat cicilannya juga akan terhapus.`)) return
    const { error } = await supabase.from('event_participants').delete().eq('id', id)
    if (error) toast.error('Gagal menghapus')
    else { toast.success(`${name} dihapus`); load() }
  }

  // Installment CRUD
  const openAddInstallment = (participantId: string) => {
    setActiveParticipantId(participantId)
    setEditInstallment(null)
    setInstallmentForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
    setShowInstallmentModal(true)
  }

  const openEditInstallment = (participantId: string, inst: Installment) => {
    setActiveParticipantId(participantId)
    setEditInstallment(inst)
    setInstallmentForm({ amount: String(inst.amount), payment_date: inst.payment_date, notes: inst.notes ?? '' })
    setShowInstallmentModal(true)
  }

  const handleSaveInstallment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeParticipantId || !event) return
    setSavingInstallment(true)
    const payload = { participant_id: activeParticipantId, amount: parseFloat(installmentForm.amount), payment_date: installmentForm.payment_date, notes: installmentForm.notes || null }

    if (editInstallment) {
      const { error } = await supabase.from('installments').update(payload).eq('id', editInstallment.id)
      if (error) { toast.error('Gagal update cicilan'); setSavingInstallment(false); return }
    } else {
      const { error } = await supabase.from('installments').insert(payload)
      if (error) { toast.error('Gagal menyimpan cicilan: ' + error.message); setSavingInstallment(false); return }
    }

    // Recalculate total paid for this participant and update status
    const { data: allInstalls } = await supabase.from('installments').select('amount').eq('participant_id', activeParticipantId)
    const total = (allInstalls ?? []).reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0)
    const participant = participants.find(p => p.id === activeParticipantId)
    const target = participant?.target_amount ?? event.target_amount_per_person
    await updatePaymentStatus(activeParticipantId, total, target)

    toast.success(editInstallment ? 'Cicilan diupdate!' : 'Pembayaran dicatat!')
    setShowInstallmentModal(false)
    load()
    setSavingInstallment(false)
  }

  const handleDeleteInstallment = async (installId: string, participantId: string) => {
    if (!confirm('Hapus catatan cicilan ini?') || !event) return
    await supabase.from('installments').delete().eq('id', installId)
    const { data: allInstalls } = await supabase.from('installments').select('amount').eq('participant_id', participantId)
    const total = (allInstalls ?? []).reduce((s: number, i: { amount: number }) => s + Number(i.amount), 0)
    const participant = participants.find(p => p.id === participantId)
    const target = participant?.target_amount ?? event.target_amount_per_person
    await updatePaymentStatus(participantId, total, target)
    toast.success('Cicilan dihapus')
    load()
  }

  // Import / Export Handlers
  const handleExportPDF = () => {
    if (!event) return
    const note = `Biaya default per orang: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(event.target_amount_per_person)}. Peserta dengan biaya berbeda ditandai secara khusus.`
    exportParticipantsPDF(participants, event.name, event.target_amount_per_person, note)
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
        .filter(row => row.name && row.name !== 'HAPUS BARIS CONTOH INI SEBELUM IMPORT')
        .map(row => ({
          event_id: eventId,
          name: row.name.toString().trim(),
          target_amount: row.target_amount ? parseFloat(row.target_amount) : null
        }))

      if (rowsToInsert.length === 0) {
        toast.error('Tidak ada data valid untuk diimport')
        setImporting(false)
        return
      }

      const { error } = await supabase.from('event_participants').insert(rowsToInsert)
      
      if (error) throw error
      
      toast.success(`${rowsToInsert.length} peserta berhasil diimport!`)
      load()
    } catch (err: any) {
      toast.error('Gagal import: ' + err.message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="skeleton h-8 w-48 mb-6 rounded-xl" />
        <div className="skeleton h-36 rounded-2xl mb-4" />
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      </div>
    )
  }

  if (!event) return null

  const totalCollected = participants.reduce((s, p) => s + p.totalPaid, 0)
  const totalTarget = event.target_amount_per_person * participants.length
  const pct = totalTarget > 0 ? Math.min((totalCollected / totalTarget) * 100, 100) : 0
  const countPaid = participants.filter(p => p.payment_status === 'paid').length
  const countPartial = participants.filter(p => p.payment_status === 'partial').length
  const countUnpaid = participants.filter(p => p.payment_status === 'unpaid').length

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <Link href="/events" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.4)' }}>
        <ArrowLeft size={15} /> Kembali ke Event
      </Link>

      {/* Event Header Card */}
      <div className="glass rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge" style={event.status === 'active' ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                {event.status === 'active' ? <><Clock size={9} /> Aktif</> : <><CheckCircle2 size={9} /> Selesai</>}
              </span>
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{event.name}</h1>
            {event.description && <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{event.description}</p>}
            {event.event_date && <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}><CalendarDays size={11} />{formatDate(event.event_date)}</p>}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Terkumpul</p>
            <p className="text-sm font-bold" style={{ color: '#4ade80', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatRupiah(totalCollected)}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Target Total</p>
            <p className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatRupiah(totalTarget)}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Peserta</p>
            <p className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}><Users size={13} className="inline mr-1" />{participants.length} orang</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span>Progress Pembayaran</span>
            <span className="font-semibold" style={{ color: pct >= 100 ? '#4ade80' : '#a5b4fc' }}>{Math.round(pct)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
          </div>
          <div className="flex gap-4 mt-2.5">
            <span className="text-xs flex items-center gap-1" style={{ color: '#4ade80' }}><CheckCircle2 size={10} /> {countPaid} Lunas</span>
            <span className="text-xs flex items-center gap-1" style={{ color: '#facc15' }}><Clock size={10} /> {countPartial} Mencicil</span>
            <span className="text-xs flex items-center gap-1" style={{ color: '#94a3b8' }}><AlertCircle size={10} /> {countUnpaid} Belum Bayar</span>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Daftar Peserta</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportPDF} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1">
            <FileDown size={14} /> PDF
          </button>
          
          <div className="relative group">
            <button className="btn-secondary text-sm py-2 px-3 flex items-center gap-1">
              <FileUp size={14} /> Import Excel
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 p-2 rounded-xl glass border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={downloadParticipantsTemplate} className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                1. Download Template
              </button>
              <label className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {importing ? '2. Mengimpor...' : '2. Upload File Excel'}
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} ref={fileInputRef} disabled={importing} />
              </label>
            </div>
          </div>

          <button className="btn-primary text-sm py-2 px-4 ml-auto sm:ml-0" onClick={openAddParticipant}>
            <Plus size={14} /> Tambah
          </button>
        </div>
      </div>

      {participants.length === 0 && (
        <div className="glass rounded-2xl text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-sm font-semibold mb-1">Belum ada peserta</p>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Tambahkan peserta untuk mulai mencatat pembayaran</p>
          <button className="btn-primary text-sm" onClick={openAddParticipant}><Plus size={14} /> Tambah Peserta</button>
        </div>
      )}

      <div className="space-y-3">
        {participants.map((p, idx) => {
          const pctParticipant = p.activeTarget > 0 ? Math.min((p.totalPaid / p.activeTarget) * 100, 100) : 0
          const isExpanded = expandedId === p.id
          return (
            <div key={p.id} className="glass rounded-2xl overflow-hidden transition-all" style={{ animationDelay: `${idx * 0.04}s` }}>
              {/* Participant Row */}
              <div className="flex items-center gap-3 p-4">
                {/* Nomor Urut */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))', color: '#a5b4fc', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    {p.target_amount && (
                      <span className="badge flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                        Kustom: {formatRupiah(p.target_amount)}
                      </span>
                    )}
                    <span className="badge flex-shrink-0" style={getStatusStyle(p.payment_status)}>
                      {getStatusIcon(p.payment_status)}{getPaymentStatusLabel(p.payment_status)}
                    </span>
                  </div>
                  {/* Progress bar mini */}
                  <div className="flex items-center gap-2">
                    <div className="progress-track flex-1" style={{ height: '5px' }}>
                      <div className="progress-fill" style={{ width: `${pctParticipant}%`, background: pctParticipant >= 100 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)', minWidth: 32 }}>{Math.round(pctParticipant)}%</span>
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: '#4ade80' }}>Bayar: {formatRupiah(p.totalPaid)}</span>
                    {p.remaining > 0 && <span className="text-xs" style={{ color: '#f87171' }}>Sisa: {formatRupiah(p.remaining)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openAddInstallment(p.id)} className="p-2 rounded-lg text-xs hover:bg-indigo-500/20 transition-all flex items-center gap-1 font-medium" style={{ color: '#818cf8', background: 'rgba(99,102,241,0.1)' }}>
                    <Plus size={12} /><span className="hidden sm:inline">Bayar</span>
                  </button>
                  <button onClick={() => openEditParticipant(p)} className="p-2 rounded-lg hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDeleteParticipant(p.id, p.name)} className="p-2 rounded-lg hover:bg-red-500/15 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}><Trash2 size={13} /></button>
                  <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="p-2 rounded-lg hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded: Installment History */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>RIWAYAT PEMBAYARAN</p>
                    {p.installments.length === 0 ? (
                      <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada pembayaran tercatat</p>
                    ) : (
                      <div className="space-y-1.5">
                        {p.installments.map((inst, i) => (
                          <div key={inst.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                              <Wallet size={11} style={{ color: '#4ade80' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>+{formatRupiah(inst.amount)}</p>
                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {formatDate(inst.payment_date)}{inst.notes ? ` — ${inst.notes}` : ''}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => openEditInstallment(p.id, inst)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}><Pencil size={11} /></button>
                              <button onClick={() => handleDeleteInstallment(inst.id, p.id)} className="p-1.5 rounded-lg hover:bg-red-500/15" style={{ color: 'rgba(255,255,255,0.4)' }}><Trash2 size={11} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total row */}
                    {p.installments.length > 0 && (
                      <div className="flex justify-between items-center px-3 py-2 mt-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Dibayar</span>
                        <span className="text-sm font-bold" style={{ color: '#a5b4fc', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatRupiah(p.totalPaid)}</span>
                      </div>
                    )}

                    <button onClick={() => openAddInstallment(p.id)} className="mt-3 btn-secondary w-full justify-center text-sm py-2">
                      <Plus size={13} /> Catat Pembayaran
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit Participant Modal */}
      {showParticipantModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowParticipantModal(false) }}>
          <div className="modal-content p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{editParticipant ? 'Edit Nama Peserta' : 'Tambah Peserta'}</h2>
              <button onClick={() => setShowParticipantModal(false)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveParticipant} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Nama Peserta *</label>
                <input
                  autoFocus
                  type="text"
                  className="input-base"
                  placeholder="Masukkan nama peserta..."
                  value={participantName}
                  onChange={e => setParticipantName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Biaya Kustom (Opsional)</label>
                <input
                  type="number"
                  className="input-base"
                  placeholder={`Default: ${formatRupiah(event.target_amount_per_person)}`}
                  value={participantTarget}
                  onChange={e => setParticipantTarget(e.target.value)}
                  min="0"
                />
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Isi jika biaya untuk peserta ini berbeda dengan biaya default event.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowParticipantModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={savingParticipant}>
                  {savingParticipant ? <Loader2 size={15} className="animate-spin" /> : null}
                  {editParticipant ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Installment Modal */}
      {showInstallmentModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowInstallmentModal(false) }}>
          <div className="modal-content p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{editInstallment ? 'Edit Catatan Bayar' : 'Catat Pembayaran'}</h2>
              <button onClick={() => setShowInstallmentModal(false)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={18} /></button>
            </div>
            {activeParticipantId && (() => {
              const part = participants.find(p => p.id === activeParticipantId)
              return part ? (
                <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    {part.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{part.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Sisa: {formatRupiah(part.remaining)}</p>
                  </div>
                </div>
              ) : null
            })()}
            <form onSubmit={handleSaveInstallment} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Nominal Bayar *</label>
                <input autoFocus type="number" className="input-base" placeholder="0" value={installmentForm.amount} onChange={e => setInstallmentForm(f => ({ ...f, amount: e.target.value }))} required min="1" />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Tanggal Bayar *</label>
                <input type="date" className="input-base" value={installmentForm.payment_date} onChange={e => setInstallmentForm(f => ({ ...f, payment_date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Catatan</label>
                <input type="text" className="input-base" placeholder="cth: Cicilan ke-2, transfer BRI..." value={installmentForm.notes} onChange={e => setInstallmentForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowInstallmentModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={savingInstallment}>
                  {savingInstallment ? <Loader2 size={15} className="animate-spin" /> : null}
                  {editInstallment ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
