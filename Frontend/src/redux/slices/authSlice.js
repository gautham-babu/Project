import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';
import { dispatchError, dispatchSuccess } from '../../utils/errorHelpers';

// Async thunks for authentication
export const register = createAsyncThunk(
  'auth/register',
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/register', credentials);
      
      // Dispatch success notification
      dispatchSuccess(dispatch, 'Account created successfully! Please log in.');
      
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Registration');
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (email, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/send-otp', { email });
      dispatchSuccess(dispatch, 'Verification code sent successfully!');
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Send OTP');
      return rejectWithValue(error.response?.data?.error || 'Failed to send OTP');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/login', credentials);
      const { token, message, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('email', user.email);
      localStorage.setItem('displayName', `${user.firstName} ${user.lastName}`);
      
      dispatchSuccess(dispatch, `Welcome back, ${user.firstName}!`);
      
      return {
        token,
        user: `${user.firstName} ${user.lastName}`,
        email: user.email,
        profile: user,
        message,
      };
    } catch (error) {
      dispatchError(dispatch, error, 'Login');
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const getUserInfo = createAsyncThunk(
  'auth/getUserInfo',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.get('/user');
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Get User Info');
      return rejectWithValue(error.response?.data?.error || 'Failed to get user info');
    }
  }
);

export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async ({ currentPassword, newPassword }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.put('/user', {
        currentPassword,
        password: newPassword,
      });
      
      // Dispatch success notification
      dispatchSuccess(dispatch, 'Password updated successfully!');
      
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Password Update');
      return rejectWithValue(error.response?.data?.error || 'Password update failed');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.delete('/user');
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      localStorage.removeItem('displayName');
      
      // Dispatch success notification
      dispatchSuccess(dispatch, 'Account deleted successfully.');
      
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Account Deletion');
      return rejectWithValue(error.response?.data?.error || 'Account deletion failed');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/forgot-password', { email });
      dispatchSuccess(dispatch, response.data.message || 'Reset link sent successfully!');
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Forgot Password');
      return rejectWithValue(error.response?.data?.error || 'Failed to request reset link');
    }
  }
);

export const verifyResetToken = createAsyncThunk(
  'auth/verifyResetToken',
  async (token, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/api/verify-reset-token/${token}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Invalid or expired reset link');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/api/reset-password', { token, password });
      dispatchSuccess(dispatch, 'Password reset successfully! Please log in.');
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Reset Password');
      return rejectWithValue(error.response?.data?.error || 'Password reset failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: localStorage.getItem('displayName') || localStorage.getItem('email') || null,
    email: localStorage.getItem('email') || null,
    profile: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    otpLoading: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.email = null;
      state.profile = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      localStorage.removeItem('displayName');
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state) => {
        state.loading = false;
      })
      // Send OTP
      .addCase(sendOtp.pending, (state) => {
        state.otpLoading = true;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.otpLoading = false;
      })
      .addCase(sendOtp.rejected, (state) => {
        state.otpLoading = false;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.email = action.payload.email;
        state.profile = action.payload.profile;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
      })
      // Get User Info
      .addCase(getUserInfo.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserInfo.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.user) {
          const { firstName, lastName, email } = action.payload.user;
          state.user = `${firstName} ${lastName}`;
          state.email = email;
          state.profile = action.payload.user;
          localStorage.setItem('displayName', `${firstName} ${lastName}`);
          localStorage.setItem('email', email);
        }
      })
      .addCase(getUserInfo.rejected, (state) => {
        state.loading = false;
      })
      // Update Password
      .addCase(updatePassword.pending, (state) => {
        state.loading = true;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updatePassword.rejected, (state) => {
        state.loading = false;
      })
      // Delete Account
      .addCase(deleteAccount.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteAccount.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.email = null;
        state.profile = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(deleteAccount.rejected, (state) => {
        state.loading = false;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state) => {
        state.loading = false;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state) => {
        state.loading = false;
      })
      // Verify Reset Token
      .addCase(verifyResetToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(verifyResetToken.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyResetToken.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
