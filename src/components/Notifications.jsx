import { useState, useRef, useEffect } from 'react'
import { Bell, X, Trash2, CheckCheck } from 'lucide-react'

/**
 * Notifications dropdown.
 *
 * Props:
 *  - notifications: [{ id, icon, color, text, action, isDb?, _raw? }]
 *      `isDb`: true if the row corresponds to a real DB notification that
 *              the user can dismiss/delete; smart computed alerts (today's
 *              appointment, profile-incomplete, recent lab) are not
 *              dismissible because they recompute from data.
 *      `_raw`: pass the original DB doc through so onDeleteOne / onMarkRead
 *              can call the API.
 *  - onDeleteOne(id):  delete a single DB notification
 *  - onClearAll():     clear all DB notifications
 *  - onMarkAllRead():  mark all unread as read (still useful)
 */
export default function Notifications({
  notifications = [],
  onDeleteOne,
  onClearAll,
  onMarkAllRead,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasDeletable = notifications.some((n) => n.isDb)

  return (
    <div className="relative" ref={notifRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
        aria-label="الإشعارات"
      >
        <Bell size={20} className={notifications.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-slate-400'} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        // Logical `end-0` instead of physical `right-0`. The bell button sits
        // on the visual left in RTL pages, so anchoring the dropdown's right
        // edge to the button's right edge made it extend off-screen and clip
        // every notification line. `end-0` resolves to `left: 0` in RTL and
        // keeps the original `right: 0` behavior in LTR. Width also bumped on
        // desktop so longer OTP-request messages don't wrap awkwardly.
        <div className="absolute end-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden leading-normal" dir="rtl">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between gap-2">
            <h3 className="text-white font-bold text-sm">الإشعارات</h3>
            <div className="flex items-center gap-1.5">
              {hasDeletable && onMarkAllRead && (
                <button
                  onClick={() => onMarkAllRead()}
                  title="تعليم الكل كمقروء"
                  className="text-white/90 hover:text-white p-1 rounded-md hover:bg-white/15"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {hasDeletable && onClearAll && (
                <button
                  onClick={() => {
                    if (window.confirm('هل تريد حذف جميع الإشعارات؟ لا يمكن التراجع.')) onClearAll()
                  }}
                  title="حذف الكل"
                  className="text-white/90 hover:text-white p-1 rounded-md hover:bg-white/15"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <span className="text-indigo-100 text-[11px] mr-1">{notifications.length}</span>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800">
            {notifications.length > 0 ? notifications.map(n => {
              const Icon = n.icon || Bell
              return (
                <div
                  key={n.id}
                  className="group relative w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${n.color || 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'}`}>
                    <Icon size={16} />
                  </div>
                  <button
                    onClick={() => { n.action?.(); setIsOpen(false) }}
                    className="flex-1 text-right text-sm text-gray-700 dark:text-slate-300 leading-relaxed"
                  >
                    {n.text}
                  </button>
                  {n.isDb && onDeleteOne && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteOne(n.id) }}
                      title="حذف"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )
            }) : (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                <Bell className="mx-auto text-gray-300 dark:text-slate-600 mb-2" size={32} />
                <p className="text-sm">لا توجد إشعارات جديدة</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
