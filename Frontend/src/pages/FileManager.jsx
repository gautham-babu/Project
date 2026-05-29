import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { uploadFile, downloadFile, fetchUserFiles } from '../redux/slices/fileSlice';
import { validateFile } from '../utils/validators';

const FileManager = () => {
  const { uploadedFiles, loading } = useSelector((state) => state.files);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Fetch user's files when component mounts
    dispatch(fetchUserFiles());
  }, [dispatch]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const errors = validateFile(file);
      if (errors.length > 0) {
        setValidationError(errors[0]);
        setSelectedFile(null);
      } else {
        setValidationError(null);
        setSelectedFile(file);
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const errors = validateFile(file);
      if (errors.length > 0) {
        setValidationError(errors[0]);
        setSelectedFile(null);
      } else {
        setValidationError(null);
        setSelectedFile(file);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const result = await dispatch(uploadFile(selectedFile));
    
    if (result.type === 'files/uploadFile/fulfilled') {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refresh file list after upload
      dispatch(fetchUserFiles());
    }
  };

  const handleDownload = (filename) => {
    dispatch(downloadFile(filename));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const iconColors = {
      pdf: 'text-red-600',
      png: 'text-blue-600',
      jpg: 'text-blue-600',
      jpeg: 'text-blue-600',
      txt: 'text-gray-600',
      docx: 'text-blue-700',
      mp4: 'text-purple-600',
      mov: 'text-purple-600',
      mkv: 'text-purple-600',
    };
    
    return iconColors[ext] || 'text-gray-600';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">File Manager</h1>
        <p className="mt-2 text-gray-600">Upload and manage your files</p>
      </div>

      {validationError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl text-sm">
          {validationError}
        </div>
      )}

      {/* Upload Section */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload File</h2>
        
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="btn-primary inline-block">
                Choose File
              </span>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={handleFileSelect}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.mp4,.mov,.mkv"
              />
            </label>
            <p className="mt-2 text-sm text-gray-600">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            PDF, PNG, JPG, TXT, DOCX, MP4, MOV, MKV up to 100MB
          </p>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleUpload}
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setValidationError(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Files</h2>
        
        {uploadedFiles.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-gray-500">No files uploaded yet</p>
            <p className="text-sm text-gray-400">Upload your first file to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <svg
                    className={`w-8 h-8 ${getFileIcon(file.filename)}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <p className="text-sm text-gray-500">
                      {file.uploaded_at ? new Date(file.uploaded_at * 1000).toLocaleString() : 'Recently uploaded'}
                      {file.size && ` • ${formatFileSize(file.size)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file.filename)}
                  className="btn-primary text-sm ml-4"
                  disabled={loading}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;
