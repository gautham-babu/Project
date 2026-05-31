import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';
import { dispatchError, dispatchSuccess } from '../../utils/errorHelpers';

// Async thunks for file operations
export const uploadFile = createAsyncThunk(
  'files/uploadFile',
  async (files, { dispatch, rejectWithValue }) => {
    try {
      const fileArray = Array.isArray(files) ? files : [files];
      const formData = new FormData();
      
      // Append all files to FormData
      fileArray.forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Dispatch success notification
      const count = fileArray.length;
      dispatchSuccess(
        dispatch,
        `${count} file${count !== 1 ? 's' : ''} uploaded successfully!`
      );
      
      return response.data;
    } catch (error) {
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
  async ({ id, original_name }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/download/${id}`, {
        responseType: 'blob',
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Use the original file name for the downloaded file
      link.setAttribute('download', original_name);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Dispatch success notification
      dispatchSuccess(dispatch, `File "${original_name}" downloaded successfully!`);
      
      return { id, message: 'Download started' };
    } catch (error) {
      dispatchError(dispatch, error, 'File Download');
      return rejectWithValue(error.response?.data?.error || 'File download failed');
    }
  }
);

export const deleteFile = createAsyncThunk(
  'files/deleteFile',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.delete(`/delete/${id}`);
      
      // Dispatch success notification
      dispatchSuccess(dispatch, `File deleted successfully!`);
      
      return { id, message: 'File deleted' };
    } catch (error) {
      dispatchError(dispatch, error, 'File Delete');
      return rejectWithValue(error.response?.data?.error || 'File delete failed');
    }
  }
);

export const createShareLink = createAsyncThunk(
  'files/createShareLink',
  async ({ fileId, recipientEmail, expiresInHours }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/share', {
        fileId,
        recipientEmail,
        expiresInHours,
      });

      dispatchSuccess(dispatch, 'Share link created successfully!');
      return response.data.share;
    } catch (error) {
      dispatchError(dispatch, error, 'Create Share Link');
      return rejectWithValue(error.response?.data?.error || 'Failed to create share link');
    }
  }
);

export const fetchShareLinks = createAsyncThunk(
  'files/fetchShareLinks',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.get('/shares');
      return response.data.shareLinks;
    } catch (error) {
      dispatchError(dispatch, error, 'Fetch Share Links');
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch share links');
    }
  }
);

export const deleteShareLink = createAsyncThunk(
  'files/deleteShareLink',
  async (token, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.delete(`/share/${token}`);
      dispatchSuccess(dispatch, 'Share link deleted successfully!');
      return { token };
    } catch (error) {
      dispatchError(dispatch, error, 'Delete Share Link');
      return rejectWithValue(error.response?.data?.error || 'Failed to delete share link');
    }
  }
);

const fileSlice = createSlice({
  name: 'files',
  initialState: {
    uploadedFiles: [],
    loading: false,
    uploadProgress: 0,
    shareLinks: [],
    shareLoading: false,
    shareCreating: false,
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
      })
      // Create Share Link
      .addCase(createShareLink.pending, (state) => {
        state.shareCreating = true;
      })
      .addCase(createShareLink.fulfilled, (state, action) => {
        state.shareCreating = false;
        state.shareLinks.unshift(action.payload);
      })
      .addCase(createShareLink.rejected, (state) => {
        state.shareCreating = false;
      })
      // Fetch Share Links
      .addCase(fetchShareLinks.pending, (state) => {
        state.shareLoading = true;
      })
      .addCase(fetchShareLinks.fulfilled, (state, action) => {
        state.shareLoading = false;
        state.shareLinks = action.payload;
      })
      .addCase(fetchShareLinks.rejected, (state) => {
        state.shareLoading = false;
      })
      // Delete Share Link
      .addCase(deleteShareLink.pending, (state) => {
        state.shareLoading = true;
      })
      .addCase(deleteShareLink.fulfilled, (state, action) => {
        state.shareLoading = false;
        state.shareLinks = state.shareLinks.filter(share => share.token !== action.payload.token);
      })
      .addCase(deleteShareLink.rejected, (state) => {
        state.shareLoading = false;
      });
  },
});

export const { setUploadProgress, addUploadedFile } = fileSlice.actions;
export default fileSlice.reducer;
