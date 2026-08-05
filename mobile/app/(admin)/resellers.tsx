import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { Search, UserPlus, Filter, MoreVertical, ShieldCheck } from 'lucide-react-native';

const mockResellers = [
  { id: '1', name: 'Global Tech Partners', email: 'contact@globaltech.com', clients: 45, status: 'Active', tier: 'Gold' },
  { id: '2', name: 'Apex Solutions', email: 'admin@apex.io', clients: 28, status: 'Active', tier: 'Silver' },
  { id: '3', name: 'Digital Frontiers', email: 'hello@df.net', clients: 12, status: 'Pending', tier: 'Bronze' },
  { id: '4', name: 'Nexus Systems', email: 'support@nexus.com', clients: 89, status: 'Active', tier: 'Platinum' },
];

export default function ResellerManagement() {
  const [search, setSearch] = useState('');

  const renderReseller = ({ item }: any) => (
    <TouchableOpacity className="bg-obsidian-light p-4 rounded-3xl border border-slate-700/40 mb-4 flex-row items-center">
      <View className="w-12 h-12 bg-cyan/10 rounded-2xl items-center justify-center border border-cyan/20">
        <Text className="text-cyan font-outfitBold text-lg">{item.name[0]}</Text>
      </View>
      <View className="flex-1 ml-4">
        <View className="flex-row items-center">
          <Text className="text-white font-outfitBold text-base">{item.name}</Text>
          {item.tier === 'Platinum' && (
            <View className="ml-2 bg-purple-500/20 px-2 py-0.5 rounded-full">
              <Text className="text-purple-400 text-[10px] font-inter">VIP</Text>
            </View>
          )}
        </View>
        <Text className="text-gray-500 font-inter text-xs mt-1">{item.email}</Text>
        <View className="flex-row items-center mt-2">
          <ShieldCheck size={12} color="#10B981" />
          <Text className="text-green-500 text-[10px] font-inter ml-1">{item.status}</Text>
          <View className="w-1 h-1 bg-slate-700 rounded-full mx-2" />
          <Text className="text-gray-400 text-[10px] font-inter">{item.clients} Clients</Text>
        </View>
      </View>
      <TouchableOpacity className="p-2">
        <MoreVertical size={20} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-obsidian px-4 pt-4">
      <View className="flex-row items-center mb-6">
        <View className="flex-1 flex-row items-center bg-obsidian-light border border-slate-700 rounded-2xl px-4 py-3">
          <Search size={20} color="#64748B" />
          <TextInput
            placeholder="Search Resellers..."
            placeholderTextColor="#64748B"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-3 text-white font-inter"
          />
        </View>
        <TouchableOpacity className="ml-3 w-12 h-12 bg-cyan rounded-2xl items-center justify-center">
          <UserPlus size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between items-center mb-4 px-1">
        <Text className="text-gray-400 font-inter text-sm">Showing {mockResellers.length} Partners</Text>
        <TouchableOpacity className="flex-row items-center">
          <Filter size={16} color="#00C8FF" />
          <Text className="text-cyan font-inter text-sm ml-1">Filter</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mockResellers}
        renderItem={renderReseller}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}
