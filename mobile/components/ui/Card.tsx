import React from 'react';
import { View, Text } from 'react-native';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>
      {children}
    </View>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`p-6 space-y-1.5 ${className}`}>{children}</View>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-2xl font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50 ${className}`}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </Text>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`p-6 pt-0 ${className}`}>{children}</View>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`flex flex-row items-center p-6 pt-0 ${className}`}>{children}</View>;
}
