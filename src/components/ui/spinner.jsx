import { Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils.js'

export function Spinner({ className, ...props }) {
  return <Loader2Icon role="status" aria-label="جاري التحميل" className={cn('size-4 animate-spin', className)} {...props} />
}
