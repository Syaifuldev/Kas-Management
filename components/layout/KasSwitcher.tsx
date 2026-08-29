'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useKas } from '@/lib/context/KasContext'
import type { Organization } from '@/types'
import { ChevronDown, Plus, Check, Building2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function KasSwitcher() {
  const supabase = createClient()
  const { activeKas, setActiveKas, organizations, setOrganizations } = useKas()
  const [open, setOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowNewForm(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)

    const { data: org, error } = await supabase.rpc('create_organization', {
      org_name: newName.trim(),
      org_description: newDesc.trim() || null,
    })

    if (error) {
      toast.error('Gagal membuat kas: ' + error.message)
      setSaving(false)
      return
    }

    const newOrg = typeof org === 'string' ? JSON.parse(org) : org
    const updated = [...organizations, newOrg as Organization]
    setOrganizations(updated)
    setActiveKas(newOrg as Organization)
    setNewName('')
    setNewDesc('')
    setShowNewForm(false)
    setOpen(false)
    toast.success(`Kas "${newOrg.name}" berhasil dibuat!`)
    setSaving(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setShowNewForm(false) }}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all"
        style={{ background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
          <Building2 size={13} color="white" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-semibold truncate text-slate-100">{activeKas?.name ?? 'Pilih Kas'}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Kas Aktif</p>
        </div>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'rgba(255,255,255,0.4)' }} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden z-50 animate-scale-in" style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Daftar kas */}
          <div className="p-1.5 max-h-48 overflow-y-auto">
            {organizations.length === 0 && (
              <p className="text-xs text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Belum ada kas</p>
            )}
            {organizations.map(org => (
              <button
                key={org.id}
                onClick={() => { setActiveKas(org); setOpen(false) }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all hover:bg-white/5"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
                  <Building2 size={11} style={{ color: '#818cf8' }} />
                </div>
                <span className="flex-1 text-sm truncate text-slate-200">{org.name}</span>
                {activeKas?.id === org.id && <Check size={13} style={{ color: '#818cf8' }} />}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-1.5">
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5"
                style={{ color: '#818cf8' }}
              >
                <Plus size={14} /> Tambah Kas Baru
              </button>
            ) : (
              <form onSubmit={handleCreate} className="p-2 space-y-2">
                <input
                  autoFocus
                  className="input-base text-sm py-2"
                  placeholder="Nama kas (cth: Kas Masjid Al-Ikhlas)"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
                <input
                  className="input-base text-sm py-2"
                  placeholder="Deskripsi (opsional)"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 justify-center py-2 text-sm" disabled={saving}>
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Buat
                  </button>
                  <button type="button" className="btn-secondary py-2 text-sm" onClick={() => setShowNewForm(false)}>Batal</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
