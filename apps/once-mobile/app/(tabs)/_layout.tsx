import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import { COLORS } from '../../src/constants/theme';

const TERMINAL_AMBER = '#F6C177';
const TERMINAL_CYAN = '#67E8F9';

export default function TabLayout() {
  useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: COLORS.background,
        },
        tabBarStyle: {
          backgroundColor: '#050505',
          borderTopColor: 'rgba(246, 193, 119, 0.16)',
          borderTopWidth: 1,
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: TERMINAL_AMBER,
        tabBarInactiveTintColor: '#737373',
        tabBarLabelStyle: {
          fontFamily: 'SpaceMono',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={18} color={focused ? TERMINAL_AMBER : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={18} color={focused ? TERMINAL_CYAN : color} />
          ),
        }}
      />
    </Tabs>
  );
}
