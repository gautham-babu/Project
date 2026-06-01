import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../redux/slices/fileSlice';
import { validateFile } from '../utils/validators';

const UploadFiles = () => {
  const { loading } = useSelector((state) => state.files);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [uploadError, setUploadError] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = 'Upload is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

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
    setUploadError(null);
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

    setUploadError(null);
    const result = await dispatch(uploadFile(selectedFiles));
    
    if (result.type === 'files/uploadFile/fulfilled') {
      const responseData = result.payload;
      
      if (responseData && responseData.warnings && responseData.warnings.length > 0) {
        // Retrieve names of successfully uploaded files
        const uploadedNames = (responseData.uploaded_files || []).map(f => f.original_name);
        
        // Remove successfully uploaded files from selection, keeping the failed ones
        setSelectedFiles(prev => prev.filter(file => !uploadedNames.includes(file.name)));
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Check for malicious warnings specifically
        const warningsStr = responseData.warnings.join('; ');
        if (warningsStr.toLowerCase().includes('malicious') || warningsStr.toLowerCase().includes('virustotal')) {
          const maliciousFileNames = responseData.warnings
            .filter(w => w.toLowerCase().includes('malicious') || w.toLowerCase().includes('virustotal'))
            .map(w => w.split(':')[0].trim());
            
          if (maliciousFileNames.length > 0) {
            setUploadError(`Cannot upload ${maliciousFileNames.join(', ')} as it seems to be malicious.`);
          } else {
            setUploadError('Some files were not uploaded as they seem to be malicious.');
          }
        } else {
          setUploadError('Some files failed validation: ' + warningsStr);
        }
      } else {
        // All files uploaded successfully with no warnings
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        navigate('/files');
      }
    } else {
      const errorMsg = result.payload || result.error?.message || 'File upload failed';
      if (errorMsg.toLowerCase().includes('malicious') || errorMsg.toLowerCase().includes('virustotal')) {
        setUploadError('Cannot upload file as it seems to be malicious.');
      } else {
        setUploadError(errorMsg);
      }
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
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
          className={`border-2 border-dashed rounded-xl p-6 sm:p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          } ${loading ? 'pointer-events-none opacity-50' : ''}`}
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
             <label htmlFor="file-upload" className={`cursor-pointer ${loading ? 'pointer-events-none opacity-50' : ''}`}>
              <span className={`btn-primary inline-block ${loading ? 'cursor-not-allowed' : ''}`}>Choose Files</span>
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.docx,.mp4,.mov,.mkv"
                disabled={loading}
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
                    className="ml-2 text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Remove file"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  onClick={handleUpload}
                  className="btn-primary w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload File'}
                </button>
                <button
                  onClick={() => {
                    setSelectedFiles([]);
                    setUploadError(null);
                  }}
                  className="btn-secondary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                  disabled={loading}
                >
                  Clear All
                </button>
              </div>
              {uploadError && !loading && (
                <span className="text-sm font-semibold text-red-600 animate-fadeIn bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-start gap-1.5">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="break-words">{uploadError}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadFiles;
