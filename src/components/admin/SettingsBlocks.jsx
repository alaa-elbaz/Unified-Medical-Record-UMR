/**
 * Presentational helpers for the AdminPage Settings tab.
 *  - SettingSection: titled colored panel
 *  - SettingToggle: accessible boolean toggle row with label + description
 *
 * No state, no side effects — pure JSX wrappers.
 */

export function SettingSection({ icon: Icon, title, color, children }) {
  const colors = {
    amber:  'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
    blue:   'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} />
        <h3 className="font-bold text-base">{title}</h3>
      </div>
      <div className="space-y-2 text-gray-800 dark:text-slate-200">
        {children}
      </div>
    </div>
  )
}

export function SettingToggle({ label, description, checked, onChange, disabled, danger, warning }) {
  return (
    <label className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5 ${
          checked
            ? danger ? 'bg-red-600' : warning ? 'bg-amber-600' : 'bg-blue-600'
            : 'bg-gray-300 dark:bg-slate-700'
        }`}
      >
        <span className={`absolute top-0.5 ${checked ? 'left-0.5' : 'right-0.5'} w-5 h-5 rounded-full bg-white shadow transition-transform`} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}
