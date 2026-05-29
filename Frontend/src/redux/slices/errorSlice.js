import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

// Error types for better categorization
export const ERROR_TYPES = {
  AUTH: 'auth',
  FILE: 'file',
  NETWORK: 'network',
  VALIDATION: 'validation',
  SERVER: 'server',
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const errorSlice = createSlice({
  name: 'errors',
  initialState: {
    errors: [],
    lastError: null,
  },
  reducers: {
    addError: (state, action) => {
      const error = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: action.payload.type || ERROR_TYPES.SERVER,
        severity: action.payload.severity || ERROR_SEVERITY.MEDIUM,
        message: action.payload.message,
        details: action.payload.details || null,
        source: action.payload.source || 'Unknown',
        dismissed: false,
      };

      state.errors.push(error);
      state.lastError = error;

      // Auto-show toast based on severity
      if (error.severity === ERROR_SEVERITY.CRITICAL || error.severity === ERROR_SEVERITY.HIGH) {
        toast.error(error.message, {
          duration: 6000,
          position: 'top-right',
          style: {
            background: '#FEF2F2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
          },
        });
      } else if (error.severity === ERROR_SEVERITY.MEDIUM) {
        toast.error(error.message, {
          duration: 4000,
          position: 'top-right',
        });
      }
    },

    removeError: (state, action) => {
      state.errors = state.errors.filter(error => error.id !== action.payload);
    },

    dismissError: (state, action) => {
      const error = state.errors.find(error => error.id === action.payload);
      if (error) {
        error.dismissed = true;
      }
    },

    clearErrors: (state) => {
      state.errors = [];
      state.lastError = null;
    },

    clearErrorsByType: (state, action) => {
      state.errors = state.errors.filter(error => error.type !== action.payload);
    },
  },
});

export const { 
  addError, 
  removeError, 
  dismissError, 
  clearErrors, 
  clearErrorsByType 
} = errorSlice.actions;

export default errorSlice.reducer;