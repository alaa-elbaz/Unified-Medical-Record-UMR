import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  className?: string;
  textClassName?: string;
}

export function Badge({ children, variant = 'default', className = '', textClassName = '' }: BadgeProps) {
  let bgClass = 'bg-slate-900 dark:bg-slate-50';
  let textClass = 'text-slate-50 dark:text-slate-900';
  let borderClass = 'border-transparent';

  switch (variant) {
    case 'secondary':
      bgClass = 'bg-slate-100 dark:bg-slate-800';
      textClass = 'text-slate-900 dark:text-slate-50';
      break;
    case 'destructive':
      bgClass = 'bg-red-500 dark:bg-red-900';
      textClass = 'text-slate-50 dark:text-slate-50';
      break;
    case 'outline':
      bgClass = 'bg-transparent';
      borderClass = 'border-slate-200 dark:border-slate-800 border';
      textClass = 'text-slate-950 dark:text-slate-50';
      break;
    case 'success':
      bgClass = 'bg-green-100 dark:bg-green-900/30';
      borderClass = 'border-green-200 dark:border-green-800 border';
      textClass = 'text-green-800 dark:text-green-400';
      break;
    case 'warning':
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30';
      borderClass = 'border-yellow-200 dark:border-yellow-800 border';
      textClass = 'text-yellow-800 dark:text-yellow-400';
      break;
  }

  return (
    <View className={`items-center justify-center rounded-full px-2.5 py-0.5 ${bgClass} ${borderClass} ${className}`}>
      {React.Children.map(children, child =>
        typeof child === 'string' ? (
          <Text className={`text-xs font-semibold ${textClass} ${textClassName}`}>
            {child}
          </Text>
        ) : child
      )}
    </View>
  );
}
