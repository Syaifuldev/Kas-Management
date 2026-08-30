'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKas } from '@/lib/context/KasContext'
import { formatRupiah, formatDate } from '@/lib/utils'
import type { Event } from '@/types'
import { Plus, CalendarDays, Pencil, Trash2, X, Loader2, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface FormData {
  name: string
  description: string
  target_amount_per_person: string
  event_date: string
  status: 'active' | 'completed'
}

const defaultForm: FormData = { name: '', description: '', target_amount_per_person: '', event_date: '', status: 'active' }

export default function EventsPage() {
  const supabase = createClient()
  const { activeKas } = useKas()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [participantCount, setParticipantCount] = useState<Record<string, number>>({})
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean, message: string, onConfirm: () => void } | null>(null)

  const load = useCallback(async () => {
    if (!activeKas) return
    setLoading(true)
    const { data } = await supabase.from('events').select('*').eq('organization_id', activeKas.id).order('created_at', { ascending: false })
    const evs = (data ?? []) as Event[]
    setEvents(evs)

    // Load participant counts
    const counts: Record<string, number> = {}
    for (const ev of evs) {
      const { count } = await supabase.from('event_participants').select('id', { count: 'exact', head: true }).eq('event_id', ev.id)
      counts[ev.id] = count ?? 0
    }
    setParticipantCount(counts)
    setLoading(false)
  }, [activeKas])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditEvent(null); setForm(defaultForm); setShowModal(true) }
  const openEdit = (ev: Event) => {
    setEditEvent(ev)
    setForm({ name: ev.name, description: ev.description ?? '', target_amount_per_person: String(ev.target_amount_per_person), event_date: ev.event_date ?? '', status: ev.status })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeKas) return
    setSaving(true)
    const payload = { name: form.name, description: form.description || null, target_amount_per_person: parseFloat(form.target_amount_per_person), event_date: form.event_date || null, status: form.status, organization_id: activeKas.id }

    if (editEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editEvent.id)
      if (error) toast.error('Gagal mengupdate: ' + error.message)
      else { toast.success('Event berhasil diupdate!'); setShowModal(false); load() }
    } else {
      const { error } = await supabase.from('events').insert(payload)
      if (error) toast.error('Gagal membuat event: ' + error.message)
      else { toast.success('Event berhasil dibuat!'); setShowModal(false); load() }
    }
    setSaving(false)
  }

  const handleDelete = (id: string) => {
    setConfirmState({
      isOpen: true,
      message: 'Hapus event ini? Semua peserta dan cicilan akan ikut terhapus.',
      onConfirm: async () => {
        const { error } = await supabase.from('events').delete().eq('id', id)
        if (error) toast.error('Gagal menghapus')
        else { toast.success('Event dihapus'); load() }
      }
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Manajemen Event</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{activeKas?.name ?? '-'}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Event Baru</button>
      </div>

      {loading && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2,3].map(i => <div key={i} className="skeleton h-44 rounded-2xl" />)}</div>}

      {!loading && events.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🗓️</div>
          <h2 className="text-lg font-bold mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Belum ada event</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Buat event pertama untuk mulai mencatat pembayaran peserta</p>
          <button className="btn-primary" onClick={openAdd}><Plus size={15} /> Buat Event</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!loading && events.map(ev => (
          <div key={ev.id} className="glass rounded-2xl p-5 hover:border-white/15 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${ev.status === 'active' ? '' : ''}`}
                    style={ev.status === 'active'
                      ? { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
                      : { background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.2)' }}>
                    {ev.status === 'active' ? <><Clock size={9} />Aktif</> : <><CheckCircle2 size={9} />Selesai</>}
                  </span>
                </div>
                <h3 className="text-base font-bold leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{ev.name}</h3>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => openEdit(ev)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><Pencil size={13} /></button>
                <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded-lg hover:bg-red-500/15" style={{ color: 'rgba(255,255,255,0.4)' }}><Trash2 size={13} /></button>
              </div>
            </div>

            {ev.description && <p className="text-xs mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{ev.description}</p>}

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Biaya/orang</p>
                <p className="text-sm font-bold" style={{ color: '#a5b4fc', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{formatRupiah(ev.target_amount_per_person)}</p>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Peserta</p>
                <p className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{participantCount[ev.id] ?? 0} orang</p>
              </div>
            </div>

            {ev.event_date && (
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <CalendarDays size={11} className="inline mr-1" />{formatDate(ev.event_date)}
              </p>
            )}

            <Link href={`/events/${ev.id}`} className="btn-secondary w-full justify-center text-sm py-2">
              Kelola Peserta & Pembayaran
            </Link>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal-content p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{editEvent ? 'Edit Event' : 'Buat Event Baru'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Nama Event *</label>
                <input type="text" className="input-base" placeholder="cth: Ziarah Wali Songo 2025" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Deskripsi</label>
                <textarea className="input-base" rows={2} placeholder="Keterangan tambahan tentang event..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Biaya Target per Peserta *</label>
                <input type="number" className="input-base" placeholder="0" value={form.target_amount_per_person} onChange={e => setForm(f => ({ ...f, target_amount_per_person: e.target.value }))} required min="1" />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Tanggal Pelaksanaan</label>
                <input type="date" className="input-base" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              {editEvent && (
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Status</label>
                  <select className="input-base" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'completed' }))}>
                    <option value="active">Aktif</option>
                    <option value="completed">Selesai</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Batal</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                  {editEvent ? 'Simpan' : 'Buat Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}
