import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as xlsx from 'xlsx'
import { formatRupiah, formatDate } from './utils'

// ─────────────────────────────────────────
// Shared PDF Header & Footer
// ─────────────────────────────────────────

function drawPDFHeader(doc: jsPDF, title: string, subtitle: string) {
  const pageW = doc.internal.pageSize.getWidth()

  // Background header bar
  doc.setFillColor(30, 27, 75) // deep indigo
  doc.rect(0, 0, pageW, 42, 'F')

  // Accent stripe
  doc.setFillColor(99, 102, 241) // indigo-500
  doc.rect(0, 40, pageW, 3, 'F')

  // App branding (left)
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('KAS MANAGEMENT', 14, 14)

  // Title (large)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, 14, 27)

  // Subtitle (right)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(165, 180, 252) // indigo-300
  doc.text(subtitle, pageW - 14, 20, { align: 'right' })

  // Print date (right)
  doc.setTextColor(148, 163, 184)
  doc.text(`Dicetak: ${formatDate(new Date().toISOString().split('T')[0])}`, pageW - 14, 29, { align: 'right' })
}

function drawPDFFooter(doc: jsPDF, note?: string) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Footer divider
  doc.setDrawColor(99, 102, 241)
  doc.setLineWidth(0.5)
  doc.line(14, pageH - 22, pageW - 14, pageH - 22)

  // Note text
  if (note) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(148, 163, 184)
    doc.text(`Catatan: ${note}`, 14, pageH - 15)
  }

  // Footer right: page number
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('© Syaiful Dev – Kas Management', pageW - 14, pageH - 15, { align: 'right' })
}

// ─────────────────────────────────────────
// EXPORT PDF: TRANSAKSI BUKU KAS
// ─────────────────────────────────────────

export function exportTransactionsPDF(transactions: any[], kasName: string, note?: string) {
  const doc = new jsPDF()

  drawPDFHeader(doc, kasName, 'Laporan Buku Kas')

  const tableColumn = ['No', 'Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Nominal']

  let totalIncome = 0
  let totalExpense = 0

  const tableRows: any[] = transactions.map((t, idx) => {
    const amount = Number(t.amount)
    if (t.type === 'income') totalIncome += amount
    else totalExpense += amount
    return [
      idx + 1,
      formatDate(t.date),
      t.type === 'income' ? '▲ Masuk' : '▼ Keluar',
      t.category || '-',
      t.description || '-',
      (t.type === 'income' ? '+' : '-') + formatRupiah(amount),
    ]
  })

  // Summary rows
  tableRows.push(
    [{ content: '', colSpan: 5, styles: { fillColor: [20, 20, 40] } }, ''],
    [{ content: 'Total Pemasukan', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [20, 30, 50], textColor: [74, 222, 128] } }, { content: formatRupiah(totalIncome), styles: { fontStyle: 'bold', textColor: [74, 222, 128], fillColor: [20, 30, 50] } }],
    [{ content: 'Total Pengeluaran', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [20, 30, 50], textColor: [248, 113, 113] } }, { content: formatRupiah(totalExpense), styles: { fontStyle: 'bold', textColor: [248, 113, 113], fillColor: [20, 30, 50] } }],
    [{ content: 'Saldo Akhir', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [40, 30, 80], textColor: [165, 180, 252] } }, { content: formatRupiah(totalIncome - totalExpense), styles: { fontStyle: 'bold', textColor: [165, 180, 252], fillColor: [40, 30, 80] } }],
  )

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'center'
    },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 25 },
      5: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [220, 220, 240],
    tableLineWidth: 0.1,
  })

  drawPDFFooter(doc, note ?? 'Laporan ini digenerate secara otomatis oleh sistem Kas Management.')

  doc.save(`Laporan_Kas_${kasName.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
}

// ─────────────────────────────────────────
// EXPORT PDF: PESERTA EVENT
// ─────────────────────────────────────────

export function exportParticipantsPDF(participants: any[], eventName: string, defaultCost: number, note?: string) {
  const doc = new jsPDF()

  drawPDFHeader(doc, eventName, 'Laporan Peserta Event')

  const tableColumn = ['No', 'Nama Peserta', 'Status', 'Target Biaya', 'Telah Dibayar', 'Sisa']

  let grandTotalTarget = 0
  let grandTotalPaid = 0
  let grandTotalRemaining = 0

  const tableRows: any[] = participants.map((p, idx) => {
    const target = p.target_amount ?? defaultCost
    const remaining = Math.max(0, target - p.totalPaid)
    let statusLabel = 'Belum Bayar'
    if (p.payment_status === 'paid') statusLabel = '✓ Lunas'
    else if (p.payment_status === 'partial') statusLabel = '~ Mencicil'

    grandTotalTarget += target
    grandTotalPaid += p.totalPaid
    grandTotalRemaining += remaining

    return [idx + 1, p.name, statusLabel, formatRupiah(target), formatRupiah(p.totalPaid), formatRupiah(remaining)]
  })

  const paidCount = participants.filter(p => p.payment_status === 'paid').length
  const partialCount = participants.filter(p => p.payment_status === 'partial').length
  const unpaidCount = participants.filter(p => p.payment_status === 'unpaid').length

  // Summary rows
  tableRows.push(
    [{ content: '', colSpan: 6, styles: { fillColor: [20, 20, 40] } }],
    [
      { content: `Total (${participants.length} Peserta: ${paidCount} Lunas, ${partialCount} Mencicil, ${unpaidCount} Belum Bayar)`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [40, 30, 80], textColor: [165, 180, 252] } },
      { content: formatRupiah(grandTotalTarget), styles: { fontStyle: 'bold', halign: 'right', fillColor: [40, 30, 80], textColor: [165, 180, 252] } },
      { content: formatRupiah(grandTotalPaid), styles: { fontStyle: 'bold', halign: 'right', fillColor: [40, 30, 80], textColor: [74, 222, 128] } },
      { content: formatRupiah(grandTotalRemaining), styles: { fontStyle: 'bold', halign: 'right', fillColor: [40, 30, 80], textColor: [248, 113, 113] } },
    ],
  )

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'center'
    },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { halign: 'left' },
      2: { cellWidth: 26, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [220, 220, 240],
    tableLineWidth: 0.1,
    didParseCell: (data) => {
      // Colour code status
      if (data.column.index === 2 && data.section === 'body' && typeof data.cell.raw === 'string') {
        if ((data.cell.raw as string).includes('Lunas')) {
          data.cell.styles.textColor = [21, 128, 61]
          data.cell.styles.fontStyle = 'bold'
        } else if ((data.cell.raw as string).includes('Mencicil')) {
          data.cell.styles.textColor = [161, 98, 7]
        }
      }
    },
  })

  drawPDFFooter(doc, note ?? 'Laporan ini digenerate secara otomatis oleh sistem Kas Management.')

  doc.save(`Peserta_${eventName.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
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
