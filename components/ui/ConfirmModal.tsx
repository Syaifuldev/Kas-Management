import { X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

export function ConfirmModal({ isOpen, message, onConfirm, onCancel, isDanger = true }: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal-content p-6 max-w-sm">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Konfirmasi</h2>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <X size={18} />
          </button>
        </div>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {message}
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Batal</button>
          <button 
            onClick={() => { onConfirm(); onCancel(); }} 
            className={`flex-1 justify-center ${isDanger ? 'btn-danger' : 'btn-primary'}`}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  )
}
