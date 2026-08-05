import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, Briefcase, TrendingUp, Settings } from 'lucide-react-native';

export default function StaffLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#A855F7', // Staff theme color
        tabBarInactiveTintColor: '#64748B',
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#A855F7',
        headerTitleStyle: { fontFamily: 'OutfitBold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'My Clients',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Workflows',
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
