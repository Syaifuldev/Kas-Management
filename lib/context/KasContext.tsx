'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Organization } from '@/types'

interface KasContextType {
  activeKas: Organization | null
  setActiveKas: (kas: Organization) => void
  organizations: Organization[]
  setOrganizations: (orgs: Organization[]) => void
}

const KasContext = createContext<KasContextType | undefined>(undefined)

export function KasProvider({ children }: { children: React.ReactNode }) {
  const [activeKas, setActiveKasState] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('activeKasId')
    if (stored && organizations.length > 0) {
      const found = organizations.find(o => o.id === stored)
      if (found) setActiveKasState(found)
    } else if (organizations.length > 0 && !activeKas) {
      setActiveKasState(organizations[0])
    }
  }, [organizations])

  const setActiveKas = (kas: Organization) => {
    setActiveKasState(kas)
    localStorage.setItem('activeKasId', kas.id)
  }

  return (
    <KasContext.Provider value={{ activeKas, setActiveKas, organizations, setOrganizations }}>
      {children}
    </KasContext.Provider>
  )
}

export function useKas() {
  const ctx = useContext(KasContext)
  if (!ctx) throw new Error('useKas must be used within KasProvider')
  return ctx
}
