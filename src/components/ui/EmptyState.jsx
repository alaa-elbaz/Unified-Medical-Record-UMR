import React from 'react';
import { Button } from '@/components/ui/button.jsx';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  colorClass = 'text-sky-500',
  bgClass = 'bg-sky-50',
  borderClass = 'border-sky-100'
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-300">
      <div className={`w-20 h-20 rounded-full ${bgClass} dark:bg-opacity-20 ${borderClass} dark:border-opacity-30 border-4 flex items-center justify-center mb-6 shadow-sm dark:shadow-none relative overflow-hidden group`}>
        {/* Soft glow effect behind the icon */}
        <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 dark:via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
        <Icon size={36} className={`${colorClass} relative z-10 transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm leading-relaxed mb-8">{description}</p>
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="rounded-xl px-8 min-h-[48px] font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
