import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../src/store/slices/authSlice';
import { RootState } from '../../src/store/store';
import { Shield, Activity, RefreshCw, LogOut, ChevronRight, Zap } from 'lucide-react-native';
import DiagnosticService from '../../src/services/DiagnosticService';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const diagnostic = useSelector((state: RootState) => state.diagnostic);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to exit?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => dispatch(logout()), style: 'destructive' },
    ]);
  };

  const runRepair = async () => {
    await DiagnosticService.runFullCheck();
    await DiagnosticService.performSelfHealing();
    Alert.alert('Self-Healing Complete', 'Diagnostic engine has validated all core systems.');
  };

  return (
    <ScrollView className="flex-1 bg-obsidian px-4 pt-6">
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-cyan-glow rounded-full items-center justify-center border-2 border-cyan/30 mb-4">
          <Text className="text-white font-outfitBold text-3xl">{user?.name?.[0] || 'A'}</Text>
        </View>
        <Text className="text-white font-outfitBold text-xl">{user?.name || 'Administrator'}</Text>
        <Text className="text-gray-500 font-inter text-sm">{user?.email}</Text>
      </View>

      <View className="bg-obsidian-light rounded-3xl border border-slate-700/50 p-6 mb-6">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <Activity size={20} color="#00C8FF" />
            <Text className="text-white font-outfitBold text-lg ml-3">Diagnostic Engine</Text>
          </View>
          <TouchableOpacity onPress={runRepair} className="p-2 bg-cyan/10 rounded-xl">
            <RefreshCw size={18} color="#00C8FF" />
          </TouchableOpacity>
        </View>

        <View className="space-y-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 font-inter">API Health</Text>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-2 ${diagnostic.api ? 'bg-green-500' : 'bg-red-500'}`} />
              <Text className={diagnostic.api ? 'text-green-500' : 'text-red-500'}>
                {diagnostic.api ? 'Operational' : 'Issue Detected'}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 font-inter">Auth Integrity</Text>
            <Text className="text-white font-inter">{diagnostic.auth}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 font-inter">State Sync</Text>
            <Text className="text-green-500 font-inter">{diagnostic.state}</Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 font-inter">Last Check</Text>
            <Text className="text-gray-600 text-xs font-inter">
              {diagnostic.lastCheck ? new Date(diagnostic.lastCheck).toLocaleTimeString() : 'Never'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={runRepair}
          className="mt-6 bg-slate-800 py-3 rounded-2xl items-center flex-row justify-center"
        >
          <Zap size={16} color="#00C8FF" />
          <Text className="text-cyan font-outfitBold ml-2 text-sm">Force Sync & Repair</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-obsidian-light rounded-3xl border border-slate-700/50 overflow-hidden mb-12">
        <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-800">
          <View className="flex-row items-center">
            <Shield size={20} color="#94A3B8" />
            <Text className="text-white font-inter ml-4">Security Settings</Text>
          </View>
          <ChevronRight size={20} color="#475569" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-800">
          <View className="flex-row items-center">
            <Activity size={20} color="#94A3B8" />
            <Text className="text-white font-inter ml-4">Push Notifications</Text>
          </View>
          <Switch value={true} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleLogout}
          className="flex-row items-center p-4"
        >
          <LogOut size={20} color="#EF4444" />
          <Text className="text-red-500 font-inter ml-4">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
