import React from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function StaffDashboard() {
  return (
    <ScrollView className="flex-1 bg-obsidian px-4 pt-6">
      <Text className="text-white font-outfitBold text-2xl">Staff Dashboard</Text>
      <Text className="text-gray-400 font-inter mt-2">Operational overview and task performance.</Text>
      
      <View className="mt-8 p-6 bg-obsidian-light rounded-3xl border border-slate-700/50">
        <Text className="text-white font-outfitBold text-lg">My Performance</Text>
        <View className="h-40 items-center justify-center">
          <Text className="text-purple-400 font-inter">Performance Chart Placeholder</Text>
        </View>
      </View>
    </ScrollView>
  );
}
