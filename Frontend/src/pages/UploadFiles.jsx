import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../redux/slices/fileSlice';
import { validateFile } from '../utils/validators';

const UploadFiles = () => {
  const { loading } = useSelector((state) => state.files);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files) => {
    const newFiles = [];
    const errors = [];

    files.forEach((file) => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        errors.push(`${file.name}: ${fileErrors[0]}`);
      } else {
        newFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setValidationError(errors.join('; '));
    } else {
      setValidationError(null);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const result = await dispatch(uploadFile(selectedFiles));
    
    if (result.type === 'files/uploadFile/fulfilled') {
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      navigate('/files');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Files</h1>
        <p className="mt-2 text-gray-600">Upload your documents, images, videos or text files to AirShare securely.</p>
      </div>

      {validationError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl text-sm">
          {validationError}
        </div>
      )}

      <div className="card">
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="btn-primary inline-block">Choose Files</span>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.mp4,.mov,.mkv"
              />
            </label>
            <p className="mt-2 text-sm text-gray-600">or drag and drop here</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            PDF, PNG, JPG, TXT, DOCX, MP4, MOV, MKV up to 100MB
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Selected Files ({selectedFiles.length}):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-100 rounded-xl p-2 bg-gray-50/50">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-2 text-red-600 hover:text-red-700"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleUpload}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                onClick={() => setSelectedFiles([])}
                className="btn-secondary"
                disabled={loading}
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadFiles;
