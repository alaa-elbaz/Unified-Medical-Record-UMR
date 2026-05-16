import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({ 
  children, 
  variant = 'default', 
  size = 'default', 
  isLoading = false, 
  className = '', 
  textClassName = '',
  disabled,
  ...props 
}: ButtonProps) {
  
  let bgClass = 'bg-slate-900 dark:bg-slate-50';
  let textClass = 'text-slate-50 dark:text-slate-900';
  let borderClass = '';

  switch (variant) {
    case 'destructive':
      bgClass = 'bg-red-500 dark:bg-red-900';
      textClass = 'text-slate-50 dark:text-slate-50';
      break;
    case 'outline':
      bgClass = 'bg-transparent';
      borderClass = 'border border-slate-200 dark:border-slate-800';
      textClass = 'text-slate-900 dark:text-slate-50';
      break;
    case 'secondary':
      bgClass = 'bg-slate-100 dark:bg-slate-800';
      textClass = 'text-slate-900 dark:text-slate-50';
      break;
    case 'ghost':
      bgClass = 'bg-transparent';
      textClass = 'text-slate-900 dark:text-slate-50';
      break;
    case 'link':
      bgClass = 'bg-transparent';
      textClass = 'text-slate-900 dark:text-slate-50 underline';
      break;
  }

  let sizeClass = 'h-10 px-4 py-2';
  switch (size) {
    case 'sm': sizeClass = 'h-9 px-3 rounded-md'; break;
    case 'lg': sizeClass = 'h-11 px-8 rounded-md'; break;
    case 'icon': sizeClass = 'h-10 w-10 justify-center items-center'; break;
  }

  const opacityClass = (disabled || isLoading) ? 'opacity-50' : 'opacity-100';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || isLoading}
      className={`rounded-md flex-row items-center justify-center ${bgClass} ${borderClass} ${sizeClass} ${opacityClass} ${className}`}
      {...props}
    >
      {isLoading && <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#0f172a' : '#fff'} className="mr-2" size="small" />}
      {React.Children.map(children, child =>
        (typeof child === 'string' || typeof child === 'number') ? (
          <Text className={`font-medium text-sm ${textClass} ${textClassName}`}>
            {child}
          </Text>
        ) : child
      )}
    </TouchableOpacity>
  );
}
