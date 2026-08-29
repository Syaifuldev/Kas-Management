'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KasProvider, useKas } from '@/lib/context/KasContext'
import Sidebar from '@/components/layout/Sidebar'
import type { Organization } from '@/types'

function DashboardInner({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { setOrganizations, activeKas, setActiveKas, organizations } = useKas()

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: roles } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', session.user.id)

      if (!roles || roles.length === 0) return

      const ids = roles.map(r => r.organization_id)
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: true })

      if (orgs) {
        setOrganizations(orgs as Organization[])
        const storedId = localStorage.getItem('activeKasId')
        const found = storedId ? orgs.find(o => o.id === storedId) : orgs[0]
        if (found && !activeKas) setActiveKas(found as Organization)
      }
    }
    load()
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-0 mt-14 md:mt-0 overflow-x-hidden flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-6 text-center text-xs border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
          &copy; {new Date().getFullYear()} Syaiful Dev. All rights reserved.
        </footer>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <KasProvider>
      <DashboardInner>{children}</DashboardInner>
    </KasProvider>
  )
}
