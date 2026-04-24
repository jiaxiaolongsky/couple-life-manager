import { Tabs } from 'expo-router';
import React from 'react';
import { Home, Utensils, Wallet, ShoppingBag } from 'lucide-react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.icon,
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTitleStyle: {
          color: theme.text,
          fontWeight: 'bold',
        },
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarLabel: '首页',
          headerTitle: '我们的家',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: '餐饮',
          tabBarLabel: '餐饮',
          headerTitle: '餐饮计划',
          tabBarIcon: ({ color }) => <Utensils size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: '财务',
          tabBarLabel: '财务',
          headerTitle: '家庭财务',
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: '物品',
          tabBarLabel: '物品',
          headerTitle: '物品管理',
          tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
