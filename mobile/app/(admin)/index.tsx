import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { TrendingUp, Users, Package, CreditCard, Bell, ChevronRight } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/store/store';

const { width } = Dimensions.get('window');

const SummaryCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <View className="bg-obsidian-light p-4 rounded-3xl border border-slate-700/50 mb-4" style={{ width: width * 0.44 }}>
    <View className="flex-row justify-between items-start mb-4">
      <View className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} color={color} />
      </View>
      <View className="bg-green-500/10 px-2 py-1 rounded-full">
        <Text className="text-green-500 text-[10px] font-inter">+12%</Text>
      </View>
    </View>
    <Text className="text-gray-400 font-inter text-xs">{title}</Text>
    <Text className="text-white font-outfitBold text-xl mt-1">{value}</Text>
    <Text className="text-gray-500 font-inter text-[10px] mt-1">{subValue}</Text>
  </View>
);

export default function AdminDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <ScrollView className="flex-1 bg-obsidian px-4 pt-6">
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-gray-400 font-inter">Welcome back,</Text>
          <Text className="text-white font-outfitBold text-2xl">{user?.name || 'Administrator'}</Text>
        </View>
        <TouchableOpacity className="w-12 h-12 bg-obsidian-light rounded-full items-center justify-center border border-slate-700">
          <Bell size={24} color="#00C8FF" />
          <View className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-obsidian" />
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap justify-between">
        <SummaryCard 
          title="Total Revenue" 
          value="$45,230" 
          subValue="vs $38,400 last month" 
          icon={TrendingUp} 
          color="#00C8FF" 
        />
        <SummaryCard 
          title="Active Resellers" 
          value="128" 
          subValue="12 new this week" 
          icon={Users} 
          color="#A855F7" 
        />
        <SummaryCard 
          title="Total Clients" 
          value="1,420" 
          subValue="Global ecosystem" 
          icon={Package} 
          color="#3B82F6" 
        />
        <SummaryCard 
          title="Pending Payouts" 
          value="$12,850" 
          subValue="48 requests pending" 
          icon={CreditCard} 
          color="#F59E0B" 
        />
      </View>

      <View className="mt-6 mb-12">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white font-outfitBold text-lg">Recent Activities</Text>
          <TouchableOpacity>
            <Text className="text-cyan font-inter text-sm">View All</Text>
          </TouchableOpacity>
        </View>

        {[1, 2, 3].map((i) => (
          <View key={i} className="bg-obsidian-light p-4 rounded-2xl border border-slate-700/30 mb-3 flex-row items-center">
            <View className="w-10 h-10 bg-slate-800 rounded-full items-center justify-center">
              <Users size={20} color="#94A3B8" />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-white font-inter text-sm">New Reseller: TechNova Solutions</Text>
              <Text className="text-gray-500 font-inter text-xs mt-1">2 hours ago • Onboarding</Text>
            </View>
            <ChevronRight size={20} color="#475569" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
