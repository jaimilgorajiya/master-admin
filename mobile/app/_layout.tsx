import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_400Regular, Outfit_700Bold } from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { store, persistor } from '../src/store/store';
import DiagnosticService from '../src/services/DiagnosticService';
import "./global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: Inter_400Regular,
    InterBold: Inter_700Bold,
    Outfit: Outfit_400Regular,
    OutfitBold: Outfit_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      // Initialize Diagnostic Engine
      DiagnosticService.runFullCheck();
      DiagnosticService.startMonitoring();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#00C8FF',
            headerTitleStyle: { fontFamily: 'OutfitBold' },
            contentStyle: { backgroundColor: '#0F172A' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Details' }} />
        </Stack>
        <StatusBar style="light" />
      </PersistGate>
    </Provider>
  );
}
