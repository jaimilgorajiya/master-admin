import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { loginStart, loginSuccess, loginFailure } from '../src/store/slices/authSlice';
import { RootState } from '../src/store/store';
import { Fingerprint, Lock, Mail, ShieldCheck } from 'lucide-react-native';
import axios from 'axios';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    dispatch(loginStart());
    try {
      // Mocking API call for now - will integrate with backend later
      // const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/staff-auth/login`, { email, password });
      
      // Simulation
      setTimeout(async () => {
        const mockUser = { id: '1', name: 'Admin User', email };
        const mockToken = 'mock-jwt-token';
        const mockRole = 'ADMIN';

        await SecureStore.setItemAsync('userToken', mockToken);
        dispatch(loginSuccess({ user: mockUser, token: mockToken, role: mockRole }));
        router.replace('/(tabs)');
      }, 1500);

    } catch (error) {
      dispatch(loginFailure());
      Alert.alert('Login Failed', 'Invalid credentials or server error');
    }
  };

  const handleBiometricAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login with Biometrics',
      fallbackLabel: 'Use Password',
    });

    if (result.success) {
      const savedToken = await SecureStore.getItemAsync('userToken');
      if (savedToken) {
        // In real app, verify token or use saved credentials
        dispatch(loginSuccess({ user: { name: 'Saved User' }, token: savedToken, role: 'ADMIN' }));
        router.replace('/(tabs)');
      } else {
        Alert.alert('Notice', 'Please login with password once to enable biometrics');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-obsidian"
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-12">
          <View className="w-20 h-20 bg-cyan-glow rounded-3xl items-center justify-center border border-cyan/30">
            <ShieldCheck size={48} color="#00C8FF" />
          </View>
          <Text className="text-3xl font-outfitBold text-white mt-6">Master Admin</Text>
          <Text className="text-gray-400 font-inter mt-2 text-center">
            Premium Multi-Role Ecosystem
          </Text>
        </View>

        <View className="space-y-4">
          <View className="relative">
            <View className="absolute left-4 top-4 z-10">
              <Mail size={20} color="#94A3B8" />
            </View>
            <TextInput
              placeholder="Email Address"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={setEmail}
              className="bg-obsidian-light border border-slate-700 text-white rounded-2xl py-4 pl-12 pr-4 font-inter"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View className="relative">
            <View className="absolute left-4 top-4 z-10">
              <Lock size={20} color="#94A3B8" />
            </View>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              className="bg-obsidian-light border border-slate-700 text-white rounded-2xl py-4 pl-12 pr-4 font-inter"
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            onPress={handleLogin}
            disabled={isLoading}
            className={`bg-cyan py-4 rounded-2xl items-center justify-center shadow-lg shadow-cyan/50 ${isLoading ? 'opacity-70' : ''}`}
          >
            <Text className="text-obsidian font-outfitBold text-lg">
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {isBiometricAvailable && (
            <TouchableOpacity 
              onPress={handleBiometricAuth}
              className="flex-row items-center justify-center py-4"
            >
              <Fingerprint size={24} color="#00C8FF" />
              <Text className="text-cyan font-inter ml-2">Use Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="mt-12 items-center">
          <Text className="text-gray-500 font-inter text-xs">
            © 2026 IIPL Enterprise Solutions
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
