import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as xlsx from 'xlsx'
import { formatRupiah, formatDate } from './utils'

// ==========================================
// EXPORT PDF
// ==========================================

export function exportTransactionsPDF(transactions: any[], kasName: string) {
  const doc = new jsPDF()
  
  doc.setFontSize(16)
  doc.text(`Laporan Buku Kas - ${kasName}`, 14, 15)
  doc.setFontSize(10)
  doc.text(`Tanggal Cetak: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 22)

  const tableColumn = ["No", "Tanggal", "Tipe", "Kategori", "Keterangan", "Nominal"]

  let totalIncome = 0
  let totalExpense = 0

  const tableRows = transactions.map((t, idx) => {
    const amount = Number(t.amount)
    if (t.type === 'income') totalIncome += amount
    else totalExpense += amount

    return [
      idx + 1,
      formatDate(t.date),
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.category || '-',
      t.description || '-',
      (t.type === 'income' ? '+' : '-') + formatRupiah(amount)
    ]
  })

  // Total rows
  tableRows.push(
    ['', '', '', '', 'Total Pemasukan', formatRupiah(totalIncome)],
    ['', '', '', '', 'Total Pengeluaran', formatRupiah(totalExpense)],
    ['', '', '', '', 'Saldo Akhir', formatRupiah(totalIncome - totalExpense)]
  )

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    didParseCell: (data) => {
      const totalRowStart = tableRows.length - 3
      if (data.row.index >= totalRowStart) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [30, 30, 50]
      }
    }
  })

  doc.save(`Laporan_Kas_${kasName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`)
}

export function exportParticipantsPDF(participants: any[], eventName: string, defaultCost: number) {
  const doc = new jsPDF()
  
  doc.setFontSize(16)
  doc.text(`Laporan Peserta Event - ${eventName}`, 14, 15)
  doc.setFontSize(10)
  doc.text(`Tanggal Cetak: ${formatDate(new Date().toISOString().split('T')[0])}`, 14, 22)

  const tableColumn = ["No", "Nama", "Status", "Target Biaya", "Telah Dibayar", "Sisa"]

  let grandTotalTarget = 0
  let grandTotalPaid = 0
  let grandTotalRemaining = 0

  const tableRows = participants.map((p, idx) => {
    const target = p.target_amount ?? defaultCost
    const remaining = Math.max(0, target - p.totalPaid)
    let statusLabel = 'Belum Bayar'
    if (p.payment_status === 'paid') statusLabel = 'Lunas'
    else if (p.payment_status === 'partial') statusLabel = 'Mencicil'

    grandTotalTarget += target
    grandTotalPaid += p.totalPaid
    grandTotalRemaining += remaining

    return [
      idx + 1,
      p.name,
      statusLabel,
      formatRupiah(target),
      formatRupiah(p.totalPaid),
      formatRupiah(remaining)
    ]
  })

  // Total row
  tableRows.push([
    '',
    'TOTAL',
    `${participants.filter(p => p.payment_status === 'paid').length} Lunas / ${participants.length} Orang`,
    formatRupiah(grandTotalTarget),
    formatRupiah(grandTotalPaid),
    formatRupiah(grandTotalRemaining)
  ])

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    // Style for total row
    didParseCell: (data) => {
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [30, 30, 50]
      }
    }
  })

  doc.save(`Peserta_${eventName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`)
}

// ==========================================
// EXPORT EXCEL TEMPLATE
// ==========================================

export function downloadTransactionsTemplate() {
  const wb = xlsx.utils.book_new()
  const wsData = [
    ["type", "amount", "category", "description", "date"],
    ["income", 500000, "Donasi", "Donasi Hamba Allah", "2023-12-01"],
    ["expense", 150000, "Konsumsi", "Beli air mineral", "2023-12-02"],
    ["", "", "", "HAPUS BARIS CONTOH INI SEBELUM IMPORT", ""]
  ]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  ws['!cols'] = [{wch: 10}, {wch: 15}, {wch: 20}, {wch: 30}, {wch: 12}]
  
  xlsx.utils.book_append_sheet(wb, ws, "Transactions")
  xlsx.writeFile(wb, "Template_Import_Transaksi.xlsx")
}

export function downloadParticipantsTemplate() {
  const wb = xlsx.utils.book_new()
  const wsData = [
    ["name", "target_amount"],
    ["Budi Santoso", ""],
    ["Andi (Biaya Khusus)", 150000],
    ["", "HAPUS BARIS CONTOH INI SEBELUM IMPORT"]
  ]
  const ws = xlsx.utils.aoa_to_sheet(wsData)
  
  ws['!cols'] = [{wch: 30}, {wch: 20}]
  
  xlsx.utils.book_append_sheet(wb, ws, "Participants")
  xlsx.writeFile(wb, "Template_Import_Peserta.xlsx")
}

// ==========================================
// PARSE EXCEL IMPORT
// ==========================================

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
