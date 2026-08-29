import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatDate } from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 70,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#334155'
  },
  // Header
  headerContainer: {
    backgroundColor: '#1e1b4b', // deep indigo
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    color: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  headerLeft: {
    flex: 1
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4
  },
  brandText: {
    fontSize: 8,
    color: '#818cf8', // indigo-400
    letterSpacing: 1
  },
  printDate: {
    fontSize: 8,
    color: '#64748b' // slate-500
  },
  
  // Table
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderRadius: 4,
    overflow: 'hidden'
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row'
  },
  tableRowAlternate: {
    backgroundColor: '#f8f9ff'
  },
  tableHeader: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold'
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
    padding: 6
  },
  // Columns
  colNo: { width: '8%', textAlign: 'center' },
  colDate: { width: '16%' },
  colType: { width: '15%' },
  colCategory: { width: '20%' },
  colDesc: { width: '23%' },
  colAmount: { width: '18%', textAlign: 'right' },
  
  // Cells
  cellText: { margin: 2, fontSize: 8 },
  cellHeader: { margin: 2, fontSize: 9, color: '#ffffff' },
  
  // Badges
  typeIncome: { color: '#16a34a', fontFamily: 'Helvetica-Bold' },
  typeExpense: { color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  
  // Summary Row
  summaryRow: {
    backgroundColor: '#1e293b',
    color: '#ffffff'
  },
  summaryRowSub: {
    backgroundColor: '#334155',
    color: '#ffffff'
  },
  summaryCell: {
    margin: 2,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold'
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#6366f1',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerNote: {
    fontSize: 7,
    color: '#64748b',
    fontStyle: 'italic'
  },
  footerBrand: {
    fontSize: 7,
    color: '#94a3b8'
  }
})

interface KasPDFProps {
  kasName: string
  transactions: any[]
  note?: string
}

export const KasPDF = ({ kasName, transactions, note }: KasPDFProps) => {
  let totalIncome = 0
  let totalExpense = 0

  const rows = transactions.map((t, idx) => {
    const amount = Number(t.amount)
    if (t.type === 'income') totalIncome += amount
    else totalExpense += amount
    
    return {
      idx: idx + 1,
      date: formatDate(t.date),
      type: t.type === 'income' ? 'Masuk' : 'Keluar',
      category: t.category || '-',
      desc: t.description || '-',
      amountStr: (t.type === 'income' ? '+' : '-') + formatRupiah(amount),
      isIncome: t.type === 'income'
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>KAS MANAGEMENT</Text>
            <Text style={{...styles.title, marginTop: 8}}>{kasName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.brandText}>Laporan Buku Kas</Text>
            <Text style={styles.printDate}>Dicetak: {formatDate(new Date().toISOString().split('T')[0])}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCol, styles.colNo]}><Text style={styles.cellHeader}>No</Text></View>
            <View style={[styles.tableCol, styles.colDate]}><Text style={styles.cellHeader}>Tanggal</Text></View>
            <View style={[styles.tableCol, styles.colType]}><Text style={styles.cellHeader}>Tipe</Text></View>
            <View style={[styles.tableCol, styles.colCategory]}><Text style={styles.cellHeader}>Kategori</Text></View>
            <View style={[styles.tableCol, styles.colDesc]}><Text style={styles.cellHeader}>Keterangan</Text></View>
            <View style={[styles.tableCol, styles.colAmount]}><Text style={styles.cellHeader}>Nominal</Text></View>
          </View>
          
          {/* Body */}
          {rows.map((r, i) => (
            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlternate : {}]}>
              <View style={[styles.tableCol, styles.colNo]}><Text style={styles.cellText}>{r.idx}</Text></View>
              <View style={[styles.tableCol, styles.colDate]}><Text style={styles.cellText}>{r.date}</Text></View>
              <View style={[styles.tableCol, styles.colType]}>
                <Text style={[styles.cellText, r.isIncome ? styles.typeIncome : styles.typeExpense]}>
                  {r.isIncome ? '▲ Pemasukan' : '▼ Pengeluaran'}
                </Text>
              </View>
              <View style={[styles.tableCol, styles.colCategory]}><Text style={styles.cellText}>{r.category}</Text></View>
              <View style={[styles.tableCol, styles.colDesc]}><Text style={styles.cellText}>{r.desc}</Text></View>
              <View style={[styles.tableCol, styles.colAmount]}><Text style={styles.cellText}>{r.amountStr}</Text></View>
            </View>
          ))}
          
          {/* Summary */}
          <View style={[styles.tableRow, styles.summaryRowSub]}>
            <View style={[styles.tableCol, { width: '82%', textAlign: 'right' }]}>
              <Text style={styles.summaryCell}>Total Pemasukan</Text>
            </View>
            <View style={[styles.tableCol, styles.colAmount]}>
              <Text style={[styles.summaryCell, { color: '#4ade80' }]}>{formatRupiah(totalIncome)}</Text>
            </View>
          </View>
          <View style={[styles.tableRow, styles.summaryRowSub]}>
            <View style={[styles.tableCol, { width: '82%', textAlign: 'right' }]}>
              <Text style={styles.summaryCell}>Total Pengeluaran</Text>
            </View>
            <View style={[styles.tableCol, styles.colAmount]}>
              <Text style={[styles.summaryCell, { color: '#f87171' }]}>{formatRupiah(totalExpense)}</Text>
            </View>
          </View>
          <View style={[styles.tableRow, styles.summaryRow]}>
            <View style={[styles.tableCol, { width: '82%', textAlign: 'right' }]}>
              <Text style={styles.summaryCell}>SALDO AKHIR</Text>
            </View>
            <View style={[styles.tableCol, styles.colAmount]}>
              <Text style={[styles.summaryCell, { color: '#a5b4fc' }]}>{formatRupiah(totalIncome - totalExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>Catatan: {note ?? 'Laporan otomatis dari Setor Kene.'}</Text>
          <Text style={styles.footerBrand}>© Syaiful Dev - Setor Kene</Text>
        </View>

      </Page>
    </Document>
  )
}
