import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { AlertTriangle, X } from 'lucide-react'

/**
 * ConfirmDialog — accessible confirmation modal that replaces window.confirm()
 *
 * Props:
 *  - isOpen: boolean
 *  - title: string
 *  - description: string | ReactNode
 *  - confirmLabel: string (default 'تأكيد')
 *  - cancelLabel: string (default 'إلغاء')
 *  - variant: 'danger' | 'warning' | 'info' (default 'danger')
 *  - typedConfirmation: string — if provided, user must type this string to enable confirm
 *  - loading: boolean
 *  - onConfirm: () => void
 *  - onCancel: () => void
 */
export default function ConfirmDialog({
  isOpen,
  title = 'تأكيد العملية',
  description = 'هل أنت متأكد؟',
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  typedConfirmation = '',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const inputRef = useRef(null)
  const cancelRef = useRef(null)

  // Reset typed value when dialog reopens
  const typedRef = useRef('')

  useEffect(() => {
    if (!isOpen) return
    typedRef.current = ''
    if (inputRef.current) inputRef.current.value = ''
    setTimeout(() => {
      ;(typedConfirmation ? inputRef : cancelRef).current?.focus()
    }, 50)
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, loading, onCancel, typedConfirmation])

  if (!isOpen) return null

  const variantStyles = {
    danger:  { ring: 'ring-red-200',    icon: 'text-red-600',    btn: 'bg-red-600 hover:bg-red-700' },
    warning: { ring: 'ring-amber-200',  icon: 'text-amber-600',  btn: 'bg-amber-600 hover:bg-amber-700' },
    info:    { ring: 'ring-sky-200',    icon: 'text-sky-600',    btn: 'bg-sky-600 hover:bg-sky-700' },
  }
  const v = variantStyles[variant] || variantStyles.danger

  const handleConfirm = () => {
    if (typedConfirmation && typedRef.current !== typedConfirmation) return
    onConfirm?.()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      dir="rtl"
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 ring-1 ${v.ring} animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center ${v.icon}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <div className="text-sm text-gray-600 dark:text-slate-400 mt-1 leading-relaxed">{description}</div>
          </div>
          <button
            type="button"
            onClick={() => !loading && onCancel?.()}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {typedConfirmation && (
          <div className="mb-4 mt-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
              للتأكيد، اكتب: <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-red-600 font-mono">{typedConfirmation}</code>
            </label>
            <input
              ref={inputRef}
              type="text"
              dir="ltr"
              autoComplete="off"
              onChange={(e) => { typedRef.current = e.target.value }}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm font-mono"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-100 dark:border-slate-800">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="px-5"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 text-white ${v.btn}`}
          >
            {loading ? 'جاري...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
