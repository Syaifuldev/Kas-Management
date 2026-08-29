'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import KasSwitcher from './KasSwitcher'
import {
  LayoutDashboard, BookOpen, CalendarDays, LogOut, Wallet, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: BookOpen, label: 'Buku Kas' },
  { href: '/events', icon: CalendarDays, label: 'Event' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
            <Wallet size={17} color="white" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Kas Management</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Kelola keuangan Anda</p>
          </div>
        </div>
      </div>

      {/* Kas Switcher */}
      <div className="px-3 pb-4">
        <KasSwitcher />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="mx-3 mb-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        <p className="text-xs px-2 mb-2 font-semibold" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>MENU</p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
              style={active ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' } : {}}
            >
              <Icon size={17} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#818cf8' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all text-slate-400 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut size={17} />
          Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0" style={{ background: '#0d0d15', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(10,10,15,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
            <Wallet size={15} color="white" />
          </div>
          <span className="text-sm font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Kas Management</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-white/5">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 animate-slide-in" style={{ background: '#0d0d15', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
