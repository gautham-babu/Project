import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { dismissUpload } from '../redux/slices/fileSlice';

const UploadWidget = () => {
  const uploadQueue = useSelector((state) => state.files.uploadQueue || []);
  const dispatch = useDispatch();
  const [isMinimized, setIsMinimized] = useState(false);

  if (uploadQueue.length === 0) return null;

  const activeCount = uploadQueue.filter((u) => u.status === 'uploading').length;
  const totalCount = uploadQueue.length;

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Extract names of files that failed (from warning strings like "filename: reason")
  const getFailedFileNames = (warnings) => {
    if (!warnings || warnings.length === 0) return [];
    return warnings.map((w) => {
      const colonIdx = w.indexOf(':');
      return colonIdx > 0 ? w.substring(0, colonIdx).trim() : w;
    });
  };

  const getCleanWarningMsg = (warnings) => {
    if (!warnings || warnings.length === 0) return '';
    const warningsStr = warnings.join('; ');
    if (warningsStr.toLowerCase().includes('malicious') || warningsStr.toLowerCase().includes('virustotal')) {
      return 'Cannot upload file as it seems to be malicious.';
    }
    return warningsStr;
  };

  const getCleanErrorMsg = (error) => {
    if (!error) return '';
    if (error.toLowerCase().includes('malicious') || error.toLowerCase().includes('virustotal')) {
      return 'Cannot upload file as it seems to be malicious.';
    }
    return error;
  };

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-full bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all duration-300 transform animate-fadeIn">
      {/* Widget Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          {(() => {
            const uploadingItems = uploadQueue.filter((u) => u.status === 'uploading');
            const totalFileCount = uploadingItems.reduce((acc, u) => acc + (u.fileCount || 1), 0);
            if (uploadingItems.length > 0) {
              return `Uploading ${totalFileCount} file${totalFileCount !== 1 ? 's' : ''}...`;
            }
            // All done — sum actual successfully uploaded file count
            const totalSuccess = uploadQueue.reduce((acc, u) => acc + (u.successCount ?? (u.status === 'success' ? (u.fileCount || 1) : 0)), 0);
            const allFailed = uploadQueue.every((u) => u.status === 'failed');
            if (allFailed) return `Upload failed`;
            return `Upload completed (${totalSuccess} file${totalSuccess !== 1 ? 's' : ''})`;
          })()}
        </span>
        <div className="flex items-center space-x-2">
          {/* Minimize / Expand Toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          {/* Close all if activeCount is 0 */}
          {activeCount === 0 && (
            <button
              onClick={() => {
                uploadQueue.forEach((u) => dispatch(dismissUpload(u.id)));
              }}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-200 transition-colors"
              title="Close all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Widget Body */}
      {!isMinimized && (
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 p-2 space-y-2">
          {uploadQueue.map((item) => (
            <div key={item.id} className="p-3 bg-white/50 rounded-xl border border-gray-50 flex flex-col space-y-2 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {item.status === 'warning' && item.warnings && item.warnings.length > 0 ? (
                    // Show only the failed file name(s), not the whole batch
                    <>
                      {getFailedFileNames(item.warnings).map((name, i) => (
                        <p key={i} className="text-sm font-medium text-gray-900 truncate" title={name}>
                          {name}
                        </p>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatSize(item.totalSize)}
                  </p>
                </div>

                {/* Status Icons */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {item.status === 'uploading' && (
                    <svg className="animate-spin h-5.5 w-5.5 text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {item.status === 'success' && (
                    <span className="text-green-600 bg-green-50 p-0.5 rounded-full">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  {item.status === 'warning' && (
                    <span className="text-yellow-600 bg-yellow-50 p-0.5 rounded-full" title={getCleanWarningMsg(item.warnings)}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span className="text-red-600 bg-red-50 p-0.5 rounded-full" title={getCleanErrorMsg(item.error)}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                  )}

                  {/* Dismiss individual item */}
                  {item.status !== 'uploading' && (
                    <button
                      onClick={() => dispatch(dismissUpload(item.id))}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>



              {/* Warnings / Error messaging */}
              {item.status === 'warning' && (
                <p className="text-xs font-medium text-yellow-600">
                  {getCleanWarningMsg(item.warnings)}
                </p>
              )}
              {item.status === 'failed' && (
                <p className="text-xs font-medium text-red-600">
                  {getCleanErrorMsg(item.error)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadWidget;
