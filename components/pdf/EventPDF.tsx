import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { formatRupiah, formatDate } from '@/lib/utils'

// Optional: Register custom fonts here. We'll use default Helvetica for now for simplicity and reliability.

const styles = StyleSheet.create({
  page: {
    padding: 30,
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
  subtitle: {
    fontSize: 10,
    color: '#a5b4fc', // indigo-300
    marginBottom: 8
  },
  dateBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 8,
    color: '#e0e7ff' // indigo-100
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
  
  // Stats Row
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
    padding: 10,
    borderRadius: 6,
    border: '1px solid #e2e8f0'
  },
  statLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4
  },
  statValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a'
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
  // Column specific widths
  colNo: { width: '8%', textAlign: 'center' },
  colName: { width: '28%' },
  colStatus: { width: '16%', textAlign: 'center' },
  colTarget: { width: '16%', textAlign: 'right' },
  colPaid: { width: '16%', textAlign: 'right' },
  colRemaining: { width: '16%', textAlign: 'right' },
  
  // Table Cell Text
  cellText: { margin: 2, fontSize: 8 },
  cellHeader: { margin: 2, fontSize: 9, color: '#ffffff' },
  
  // Status Colors
  statusLunas: { color: '#166534', fontFamily: 'Helvetica-Bold' }, // green-800
  statusMencicil: { color: '#854d0e' }, // yellow-800
  statusBelum: { color: '#64748b' },
  
  // Summary Row
  summaryRow: {
    backgroundColor: '#1e293b',
    color: '#ffffff'
  },
  summaryCell: {
    margin: 2,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold'
  },
  summaryValueTarget: { color: '#a5b4fc' }, // indigo-300
  summaryValuePaid: { color: '#4ade80' },   // green-400
  summaryValueRem: { color: '#f87171' },    // red-400
  
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

interface EventPDFProps {
  eventName: string
  eventDescription?: string
  eventDate?: string
  participants: any[]
  defaultCost: number
  note?: string
}

export const EventPDF = ({ eventName, eventDescription, eventDate, participants, defaultCost, note }: EventPDFProps) => {
  let grandTotalTarget = 0
  let grandTotalPaid = 0
  let grandTotalRemaining = 0
  
  const paidCount = participants.filter(p => p.payment_status === 'paid').length

  const rows = participants.map((p, idx) => {
    const target = p.target_amount ?? defaultCost
    const remaining = Math.max(0, target - p.totalPaid)
    
    grandTotalTarget += target
    grandTotalPaid += p.totalPaid
    grandTotalRemaining += remaining
    
    return {
      idx: idx + 1,
      name: p.name,
      status: p.payment_status,
      target,
      paid: p.totalPaid,
      remaining
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header (Like UI) */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandText}>KAS MANAGEMENT</Text>
            <Text style={{...styles.title, marginTop: 8}}>{eventName}</Text>
            {eventDescription && <Text style={styles.subtitle}>{eventDescription}</Text>}
            {eventDate && (
              <View style={{ alignSelf: 'flex-start' }}>
                <Text style={styles.dateBadge}>Tanggal: {formatDate(eventDate)}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.brandText}>Laporan Peserta</Text>
            <Text style={styles.printDate}>Dicetak: {formatDate(new Date().toISOString().split('T')[0])}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Terkumpul</Text>
            <Text style={{...styles.statValue, color: '#16a34a'}}>{formatRupiah(grandTotalPaid)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Target Total</Text>
            <Text style={styles.statValue}>{formatRupiah(grandTotalTarget)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Peserta</Text>
            <Text style={styles.statValue}>{participants.length} orang</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCol, styles.colNo]}><Text style={styles.cellHeader}>No</Text></View>
            <View style={[styles.tableCol, styles.colName]}><Text style={styles.cellHeader}>Nama Peserta</Text></View>
            <View style={[styles.tableCol, styles.colStatus]}><Text style={styles.cellHeader}>Status</Text></View>
            <View style={[styles.tableCol, styles.colTarget]}><Text style={styles.cellHeader}>Target Biaya</Text></View>
            <View style={[styles.tableCol, styles.colPaid]}><Text style={styles.cellHeader}>Telah Dibayar</Text></View>
            <View style={[styles.tableCol, styles.colRemaining]}><Text style={styles.cellHeader}>Sisa</Text></View>
          </View>
          
          {/* Table Body */}
          {rows.map((r, i) => (
            <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlternate : {}]}>
              <View style={[styles.tableCol, styles.colNo]}><Text style={styles.cellText}>{r.idx}</Text></View>
              <View style={[styles.tableCol, styles.colName]}><Text style={styles.cellText}>{r.name}</Text></View>
              <View style={[styles.tableCol, styles.colStatus]}>
                <Text style={[
                  styles.cellText, 
                  r.status === 'paid' ? styles.statusLunas : (r.status === 'partial' ? styles.statusMencicil : styles.statusBelum)
                ]}>
                  {r.status === 'paid' ? 'Lunas' : (r.status === 'partial' ? 'Mencicil' : 'Belum Bayar')}
                </Text>
              </View>
              <View style={[styles.tableCol, styles.colTarget]}><Text style={styles.cellText}>{formatRupiah(r.target)}</Text></View>
              <View style={[styles.tableCol, styles.colPaid]}><Text style={styles.cellText}>{formatRupiah(r.paid)}</Text></View>
              <View style={[styles.tableCol, styles.colRemaining]}><Text style={styles.cellText}>{formatRupiah(r.remaining)}</Text></View>
            </View>
          ))}
          
          {/* Table Summary */}
          <View style={[styles.tableRow, styles.summaryRow]}>
            <View style={[styles.tableCol, { width: '52%' }]}>
              <Text style={styles.summaryCell}>TOTAL ({paidCount} Lunas / {participants.length} Peserta)</Text>
            </View>
            <View style={[styles.tableCol, styles.colTarget]}><Text style={[styles.summaryCell, styles.summaryValueTarget]}>{formatRupiah(grandTotalTarget)}</Text></View>
            <View style={[styles.tableCol, styles.colPaid]}><Text style={[styles.summaryCell, styles.summaryValuePaid]}>{formatRupiah(grandTotalPaid)}</Text></View>
            <View style={[styles.tableCol, styles.colRemaining]}><Text style={[styles.summaryCell, styles.summaryValueRem]}>{formatRupiah(grandTotalRemaining)}</Text></View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerNote}>Catatan: {note ?? 'Laporan otomatis dari Kas Management.'}</Text>
          <Text style={styles.footerBrand}>© Syaiful Dev - Kas Management</Text>
        </View>

      </Page>
    </Document>
  )
}
