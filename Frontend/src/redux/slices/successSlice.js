import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

const successSlice = createSlice({
  name: 'success',
  initialState: {
    messages: [],
    lastMessage: null,
  },
  reducers: {
    addSuccess: (state, action) => {
      const success = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message: action.payload.message,
        type: action.payload.type || 'general',
        duration: action.payload.duration || 3000,
      };

      state.messages.push(success);
      state.lastMessage = success;

      // Show success toast
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
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },

    clearSuccess: (state) => {
      state.messages = [];
      state.lastMessage = null;
    },
  },
});

export const { addSuccess, removeSuccess, clearSuccess } = successSlice.actions;
export default successSlice.reducer;