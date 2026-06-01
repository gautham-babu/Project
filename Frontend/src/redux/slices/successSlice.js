import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

// Success messages are stored as history and also shown as toasts.
const successSlice = createSlice({
  name: 'success',
  initialState: {
    messages: [],
    lastMessage: null,
  },
  reducers: {
    addSuccess: (state, action) => {
      // Normalize success payloads before they hit the UI.
      const success = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message: action.payload.message,
        type: action.payload.type || 'general',
        duration: action.payload.duration || 3000,
      };

      state.messages.push(success);
      state.lastMessage = success;

      // A quick toast confirms completed actions.
      toast.success(success.message, {
        duration: success.duration,
        position: 'top-right',
        style: {
          background: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
        },
        icon: '✅',
      });
    },

    removeSuccess: (state, action) => {
      // Remove one stored success message.
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },

    clearSuccess: (state) => {
      // Clear success history when a flow resets.
      state.messages = [];
      state.lastMessage = null;
    },
  },
});

export const { addSuccess, removeSuccess, clearSuccess } = successSlice.actions;
export default successSlice.reducer;