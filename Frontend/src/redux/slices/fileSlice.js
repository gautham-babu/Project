import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';
import { dispatchError, dispatchSuccess } from '../../utils/errorHelpers';

// Async thunks for file operations
export const uploadFile = createAsyncThunk(
  'files/uploadFile',
  async (file, { dispatch, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Dispatch success notification
      dispatchSuccess(dispatch, `File "${file.name}" uploaded successfully!`);
      
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'File Upload');
      return rejectWithValue(error.response?.data?.error || 'File upload failed');
    }
  }
);

export const fetchUserFiles = createAsyncThunk(
  'files/fetchUserFiles',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.get('/files');
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Fetch Files');
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch files');
    }
  }
);

export const downloadFile = createAsyncThunk(
  'files/downloadFile',
  async (filename, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/download/${filename}`, {
        responseType: 'blob',
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Use the filename as-is, since it's already properly named by the backend
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Dispatch success notification
      dispatchSuccess(dispatch, `File "${filename}" downloaded successfully!`);
      
      return { filename, message: 'Download started' };
    } catch (error) {
      dispatchError(dispatch, error, 'File Download');
      return rejectWithValue(error.response?.data?.error || 'File download failed');
    }
  }
);

export const deleteFile = createAsyncThunk(
  'files/deleteFile',
  async (filename, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.delete(`/delete/${filename}`);
      
      // Dispatch success notification
      dispatchSuccess(dispatch, `File "${filename}" deleted successfully!`);
      
      return { filename, message: 'File deleted' };
    } catch (error) {
      dispatchError(dispatch, error, 'File Delete');
      return rejectWithValue(error.response?.data?.error || 'File delete failed');
    }
  }
);

const fileSlice = createSlice({
  name: 'files',
  initialState: {
    uploadedFiles: [],
    loading: false,
    uploadProgress: 0,
  },
  reducers: {
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    addUploadedFile: (state, action) => {
      state.uploadedFiles.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload File
      .addCase(uploadFile.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadFile.fulfilled, (state) => {
        state.loading = false;
        state.uploadProgress = 0;
      })
      .addCase(uploadFile.rejected, (state) => {
        state.loading = false;
        state.uploadProgress = 0;
      })
      // Fetch User Files
      .addCase(fetchUserFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadedFiles = action.payload.files;
      })
      .addCase(fetchUserFiles.rejected, (state) => {
        state.loading = false;
      })
      // Download File
      .addCase(downloadFile.pending, (state) => {
        state.loading = true;
      })
      .addCase(downloadFile.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(downloadFile.rejected, (state) => {
        state.loading = false;
      })
      // Delete File
      .addCase(deleteFile.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteFile.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteFile.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setUploadProgress, addUploadedFile } = fileSlice.actions;
export default fileSlice.reducer;
