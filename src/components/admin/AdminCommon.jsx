import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'

/**
 * Shared admin-page presentational components extracted from AdminPage.jsx.
 * Pure props-in / JSX-out — no shared state, no API calls.
 */

export function Pagination({ page, totalPages, onChange }) {
  const go = (p) => {
    if (p < 1 || p > totalPages || p === page) return
    onChange(p)
  }
  // Generate visible page range (smart pagination with ellipsis)
  const range = []
  const max = 5
  if (totalPages <= max + 2) {
    for (let i = 1; i <= totalPages; i++) range.push(i)
  } else {
    range.push(1)
    let start = Math.max(2, page - 1)
    let end = Math.min(totalPages - 1, page + 1)
    if (start > 2) range.push('…')
    for (let i = start; i <= end; i++) range.push(i)
    if (end < totalPages - 1) range.push('…')
    range.push(totalPages)
  }
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex-wrap gap-2">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        الصفحة <span className="font-bold text-gray-800 dark:text-slate-200">{page}</span> من <span className="font-bold">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => go(page - 1)} className="h-8 px-3">السابق</Button>
        {range.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-bold transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30'
              }`}
            >{p}</button>
          )
        )}
        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => go(page + 1)} className="h-8 px-3">التالي</Button>
      </div>
    </div>
  )
}

export function StatCard({ icon: Icon, color, value, label }) {
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800',     text: 'text-blue-600 dark:text-blue-400' },
    green:  { bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800',   text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-600 dark:text-purple-400' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800',       text: 'text-red-600 dark:text-red-400' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-600 dark:text-indigo-400' },
    teal:   { bg: 'bg-teal-50 dark:bg-teal-900/20',     border: 'border-teal-200 dark:border-teal-800',     text: 'text-teal-600 dark:text-teal-400' },
    rose:   { bg: 'bg-rose-50 dark:bg-rose-900/20',     border: 'border-rose-200 dark:border-rose-800',     text: 'text-rose-600 dark:text-rose-400' },
  }
  const c = colors[color] || colors.blue
  return (
    <Card className={`${c.bg} ${c.border} hover:shadow-md transition-shadow`}>
      <CardContent className="pt-6">
        <div className="text-center">
          <Icon className={`h-6 w-6 ${c.text} mx-auto mb-2`} />
          <div className={`text-2xl font-bold ${c.text} mb-1`}>
            {typeof value === 'number' ? value.toLocaleString('ar-EG') : value}
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
