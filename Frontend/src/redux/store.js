import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import fileReducer from './slices/fileSlice';
import notificationReducer from './slices/notificationSlice';

// Central Redux store for auth, files, and notification state.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    files: fileReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Keep Redux Toolkit quiet for known non-serializable metadata.
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
      },
    }),
});

export default store;
