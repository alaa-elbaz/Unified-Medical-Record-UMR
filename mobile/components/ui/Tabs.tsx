import React, { createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

const TabsContext = createContext<{
  value: string;
  onValueChange: (val: string) => void;
} | null>(null);

export function Tabs({ value, onValueChange, children, className = '' }: {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <View className={`w-full ${className}`}>{children}</View>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      className={`bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 ${className}`}
      contentContainerStyle={{ alignItems: 'center', flexDirection: 'row' }}
    >
      {children}
    </ScrollView>
  );
}

export function TabsTrigger({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");
  
  const isActive = context.value === value;
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => context.onValueChange(value)}
      className={`px-4 py-2 rounded-lg flex-row items-center justify-center min-w-[80px] mr-1 ${
        isActive ? 'bg-white dark:bg-slate-900 shadow-sm' : 'bg-transparent'
      } ${className}`}
    >
      {React.Children.map(children, child =>
        (typeof child === 'string' || typeof child === 'number') ? (
          <Text className={`font-semibold text-sm ${isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {child}
          </Text>
        ) : child
      )}
    </TouchableOpacity>
  );
}

export function TabsContent({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");
  
  if (context.value !== value) return null;
  return <View className={`w-full flex-1 ${className}`}>{children}</View>;
}
