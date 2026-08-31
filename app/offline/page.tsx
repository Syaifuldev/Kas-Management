'use client'

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
        color: '#f1f5f9',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
          border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          fontSize: 36,
        }}
      >
        📡
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 12,
        }}
      >
        Tidak Ada Koneksi
      </h1>

      <p
        style={{
          color: 'rgba(241,245,249,0.5)',
          fontSize: 14,
          lineHeight: 1.6,
          maxWidth: 280,
          marginBottom: 32,
        }}
      >
        Kamu sedang offline. Periksa koneksi internetmu dan coba lagi.
      </p>

      {/* Retry button */}
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          padding: '12px 28px',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        Coba Lagi
      </button>
    </div>
  )
}
