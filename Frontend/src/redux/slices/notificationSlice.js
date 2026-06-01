import { createSlice } from '@reduxjs/toolkit';

// Lightweight notification history for places that do not need toast directly.
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
  },
  reducers: {
    addNotification: (state, action) => {
      // Add timing data here so callers only pass the message details.
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        ...action.payload,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action) => {
      // Drop one notification by its generated id.
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearAllNotifications: (state) => {
      // Clear the panel/history when needed.
      state.notifications = [];
    },
  },
});

export const { addNotification, removeNotification, clearAllNotifications } = notificationSlice.actions;

// Small enum so notification types stay consistent.
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Factory helpers keep notification objects predictable.
export const createSuccessNotification = (message, options = {}) => ({
  type: NOTIFICATION_TYPES.SUCCESS,
  message,
  title: options.title || 'Success',
  duration: options.duration || 4000,
  ...options,
});

export const createErrorNotification = (message, options = {}) => ({
  // Errors can opt into a retry action.
  type: NOTIFICATION_TYPES.ERROR,
  message,
  title: options.title || 'Error',
  duration: options.duration || 6000,
  retry: options.retry || false,
  ...options,
});

export const createWarningNotification = (message, options = {}) => ({
  type: NOTIFICATION_TYPES.WARNING,
  message,
  title: options.title || 'Warning',
  duration: options.duration || 5000,
  ...options,
});

export const createInfoNotification = (message, options = {}) => ({
  type: NOTIFICATION_TYPES.INFO,
  message,
  title: options.title || 'Info',
  duration: options.duration || 4000,
  ...options,
});

export default notificationSlice.reducer;
