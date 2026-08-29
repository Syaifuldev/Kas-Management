import * as xlsx from 'xlsx'
import { pdf } from '@react-pdf/renderer'
import { EventPDF } from '@/components/pdf/EventPDF'
import { KasPDF } from '@/components/pdf/KasPDF'
import React from 'react'

// ─────────────────────────────────────────
// EXPORT PDF (ASYNC using @react-pdf/renderer)
// ─────────────────────────────────────────

export async function exportTransactionsPDF(transactions: any[], kasName: string, note?: string) {
  // @ts-ignore - The types of pdf() might be slightly restrictive but it works
  const blob = await pdf(<KasPDF kasName={kasName} transactions={transactions} note={note} />).toBlob()
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Laporan_Kas_${kasName.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function exportParticipantsPDF(participants: any[], eventName: string, eventDescription: string | undefined, eventDate: string | undefined, defaultCost: number, note?: string) {
  const blob = await pdf(
    // @ts-ignore
    <EventPDF 
      eventName={eventName}
      eventDescription={eventDescription}
      eventDate={eventDate}
      participants={participants} 
      defaultCost={defaultCost} 
      note={note} 
    />
  ).toBlob()
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Peserta_${eventName.replace(/\s+/g, '_')}_${Date.now()}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────
// EXPORT EXCEL TEMPLATE
// ─────────────────────────────────────────

export function downloadTransactionsTemplate() {
  const wb = xlsx.utils.book_new()
  const wsData = [
    ['type', 'amount', 'category', 'description', 'date'],
    ['income', 500000, 'Donasi', 'Donasi Hamba Allah', '2024-01-01'],
    ['expense', 150000, 'Konsumsi', 'Beli air mineral', '2024-01-02'],
    ['', '', '', 'HAPUS BARIS CONTOH INI SEBELUM IMPORT', ''],
  ]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 }]
  xlsx.utils.book_append_sheet(wb, ws, 'Transactions')
  xlsx.writeFile(wb, 'Template_Import_Transaksi.xlsx')
}

export function downloadParticipantsTemplate() {
  const wb = xlsx.utils.book_new()
  const wsData = [
    ['name', 'target_amount'],
    ['Budi Santoso', ''],
    ['Andi (Biaya Khusus)', 150000],
    ['', 'HAPUS BARIS CONTOH INI SEBELUM IMPORT'],
  ]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }]
  xlsx.utils.book_append_sheet(wb, ws, 'Participants')
  xlsx.writeFile(wb, 'Template_Import_Peserta.xlsx')
}

// ─────────────────────────────────────────
// PARSE EXCEL IMPORT
// ─────────────────────────────────────────

export async function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = xlsx.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = xlsx.utils.sheet_to_json(worksheet)
        resolve(json)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsBinaryString(file)
  })
}
