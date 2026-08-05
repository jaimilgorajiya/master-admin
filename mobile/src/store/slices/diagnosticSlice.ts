import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DiagnosticState {
  api: boolean;
  auth: 'VALID' | 'INVALID' | 'NO_TOKEN' | 'CONNECTION_ERROR';
  state: 'HEALTHY' | 'DRIFT_DETECTED';
  lastCheck: string | null;
}

const initialState: DiagnosticState = {
  api: true,
  auth: 'NO_TOKEN',
  state: 'HEALTHY',
  lastCheck: null,
};

const diagnosticSlice = createSlice({
  name: 'diagnostic',
  initialState,
  reducers: {
    setDiagnosticStatus: (state, action: PayloadAction<Partial<DiagnosticState>>) => {
      return { ...state, ...action.payload, lastCheck: new Date().toISOString() };
    },
  },
});

export const { setDiagnosticStatus } = diagnosticSlice.actions;
export default diagnosticSlice.reducer;
