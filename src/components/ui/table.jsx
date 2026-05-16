import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function Table({ className, ...props }) {
    return (
        <div className="w-full overflow-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <table className={cn("w-full caption-bottom text-sm rtl:text-right", className)} {...props} />
        </div>
    );
}

export function TableHeader({ className, ...props }) {
    return <thead className={cn("[&_tr]:border-b bg-gray-50/50 dark:bg-slate-800/50", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
    return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }) {
    return (
        <tfoot className={cn("border-t bg-gray-50/50 dark:bg-slate-800/50 dark:border-slate-700 font-medium [&>tr]:last:border-b-0", className)} {...props} />
    );
}

export function TableRow({ className, ...props }) {
    return (
        <tr
            className={cn(
                "border-b border-gray-100 dark:border-slate-800 transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/50 data-[state=selected]:bg-gray-50 dark:data-[state=selected]:bg-slate-800",
                className
            )}
            {...props}
        />
    );
}

export function TableHead({ className, ...props }) {
    return (
        <th
            className={cn(
                "h-12 px-4 text-right align-middle font-semibold text-gray-600 dark:text-slate-300 [&:has([role=checkbox])]:pr-0",
                className
            )}
            {...props}
        />
    );
}

export function TableCell({ className, ...props }) {
    return (
        <td
            className={cn("p-4 align-middle text-gray-800 dark:text-slate-200 [&:has([role=checkbox])]:pr-0", className)}
            {...props}
        />
    );
}

export function TableCaption({ className, ...props }) {
    return <caption className={cn("mt-4 text-sm text-gray-500 dark:text-slate-400", className)} {...props} />;
}
