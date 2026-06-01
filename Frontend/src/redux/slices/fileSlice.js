import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/apiClient';
import { dispatchError, dispatchSuccess } from '../../utils/errorHelpers';

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
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', original_name);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

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

export const deleteAllFiles = createAsyncThunk(
  'files/deleteAllFiles',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.delete('/files/all');
      dispatchSuccess(dispatch, response.data.message || 'All files deleted successfully!');
      return response.data;
    } catch (error) {
      dispatchError(dispatch, error, 'Delete All Files');
      return rejectWithValue(error.response?.data?.error || 'Failed to delete all files');
    }
  }
);

const fileSlice = createSlice({
  name: 'files',
  initialState: {
    uploadedFiles: [],
    loading: false,
    uploadQueue: [],
    shareLinks: [],
    shareLoading: false,
    shareCreating: false,
  },
  reducers: {
    startUpload: (state, action) => {
      state.uploadQueue.push(action.payload);
    },
    updateUploadProgress: (state, action) => {
      const upload = state.uploadQueue.find(u => u.id === action.payload.id);
      if (upload) {
        upload.progress = action.payload.progress;
      }
    },
    finishUpload: (state, action) => {
      const upload = state.uploadQueue.find(u => u.id === action.payload.id);
      if (upload) {
        upload.status = action.payload.status;
        upload.progress = 100;
        if (action.payload.error) {
          upload.error = action.payload.error;
        }
        if (action.payload.warnings) {
          upload.warnings = action.payload.warnings;
        }
        if (action.payload.successCount !== undefined) {
          upload.successCount = action.payload.successCount;
        }
      }
    },
    dismissUpload: (state, action) => {
      state.uploadQueue = state.uploadQueue.filter(u => u.id !== action.payload);
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
      })
      .addCase(uploadFile.rejected, (state) => {
        state.loading = false;
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
      })
      // Delete All Files
      .addCase(deleteAllFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteAllFiles.fulfilled, (state) => {
        state.loading = false;
        state.uploadedFiles = [];
        state.shareLinks = [];
      })
      .addCase(deleteAllFiles.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { 
  startUpload,
  updateUploadProgress,
  finishUpload,
  dismissUpload
} = fileSlice.actions;

export const uploadFile = createAsyncThunk(
  'files/uploadFile',
  async (payload, { dispatch, rejectWithValue }) => {
    const isObject = payload && !Array.isArray(payload) && payload.files;
    const files = isObject ? payload.files : payload;
    const fileArray = Array.isArray(files) ? files : [files];
    const uploadId = isObject && payload.uploadId ? payload.uploadId : (Date.now().toString() + Math.random().toString(36).substr(2, 9));
    try {
      const formData = new FormData();
      const fileNames = fileArray.map(f => f.name).join(', ');
      const totalSize = fileArray.reduce((acc, f) => acc + f.size, 0);
      dispatch(startUpload({
        id: uploadId,
        fileName: fileNames,
        fileCount: fileArray.length,
        totalSize,
        progress: 0,
        status: 'uploading',
        error: null
      }));
      
      fileArray.forEach((file) => {
        formData.append('files', file);
      });

      const response = await apiClient.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || totalSize));
          dispatch(updateUploadProgress({ id: uploadId, progress: percentCompleted }));
        }
      });
      const count = fileArray.length;
      dispatchSuccess(
        dispatch,
        `${count} file${count !== 1 ? 's' : ''} uploaded successfully!`
      );
      
      const hasWarnings = response.data.warnings && response.data.warnings.length > 0;
      const successCount = (response.data.uploaded_files || []).length;
      dispatch(finishUpload({
        id: uploadId,
        status: hasWarnings ? 'warning' : 'success',
        warnings: response.data.warnings,
        successCount,
      }));
      
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'File upload failed';
      dispatch(finishUpload({ id: uploadId, status: 'failed', error: errorMsg }));
      return rejectWithValue(errorMsg);
    }
  }
);

export default fileSlice.reducer;
