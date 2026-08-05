import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { store } from '../store/store';
import { setDiagnosticStatus } from '../store/slices/diagnosticSlice';

class DiagnosticService {
  private static instance: DiagnosticService;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DiagnosticService {
    if (!DiagnosticService.instance) {
      DiagnosticService.instance = new DiagnosticService();
    }
    return DiagnosticService.instance;
  }

  public async runFullCheck() {
    console.log('[Diagnostic] Starting Full Health Check...');
    const results = {
      api: await this.checkAPIHealth(),
      auth: await this.checkAuthIntegrity(),
      state: await this.validateStateIntegrity(),
    };
    
    store.dispatch(setDiagnosticStatus(results));
    return results;
  }

  private async checkAPIHealth() {
    try {
      // Replace with actual API base URL from env
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/public/health`);
      return response.status === 200;
    } catch (error) {
      console.error('[Diagnostic] API Health Check Failed', error);
      return false;
    }
  }

  private async checkAuthIntegrity() {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) return 'NO_TOKEN';
    
    try {
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/user/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.valid ? 'VALID' : 'INVALID';
    } catch (error) {
      return 'CONNECTION_ERROR';
    }
  }

  private async validateStateIntegrity() {
    const state = store.getState();
    // Logic to compare critical state keys against server snapshots or defaults
    if (!state.auth.user && await SecureStore.getItemAsync('userToken')) {
      console.warn('[Diagnostic] State Drift Detected: Token exists but no user in state.');
      return 'DRIFT_DETECTED';
    }
    return 'HEALTHY';
  }

  public async performSelfHealing() {
    const status = store.getState().diagnostic;
    if (status.state === 'DRIFT_DETECTED') {
      console.log('[Diagnostic] Attempting Soft Reset (Syncing user data)...');
      // Trigger a re-fetch of user profile
    }
  }

  public startMonitoring(intervalMs: number = 60000) {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = setInterval(() => this.runFullCheck(), intervalMs);
  }

  public stopMonitoring() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
  }
}

export default DiagnosticService.getInstance();
