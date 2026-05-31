import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../redux/api/apiClient';

const SharePreview = () => {
  const { token } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [textPreview, setTextPreview] = useState('');
  const [loadingText, setLoadingText] = useState(false);

  useEffect(() => {
    const fetchShareInfo = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await axios.get(`${API_BASE_URL}/share/info/${token}`);
        setFileInfo(data);
        
        if (data.extension === 'txt') {
          try {
            setLoadingText(true);
            const textRes = await axios.get(`${API_BASE_URL}/share/${token}`);
            setTextPreview(textRes.data);
          } catch (err) {
            console.error('Failed to load text preview', err);
          } finally {
            setLoadingText(false);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load shared file.');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchShareInfo();
  }, [token]);

  const handleDownload = () => {
    window.location.href = `${API_BASE_URL}/share/${token}?download=1`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
  };

  const formatExpiry = (timestamp) => {
    return timestamp ? new Date(timestamp * 1000).toLocaleString() : '';
  };

  const renderPreview = () => {
    if (!fileInfo) return null;
    const ext = fileInfo.extension?.toLowerCase() || '';
    const fileUrl = `${API_BASE_URL}/share/${token}`;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <img src={fileUrl} alt="preview" className="max-w-full max-h-[400px] object-contain rounded" />;
    }
    if (['mp4', 'webm', 'ogg'].includes(ext)) {
      return <video src={fileUrl} controls className="w-full max-h-[400px] rounded" />;
    }
    if (ext === 'pdf') {
      return <iframe src={fileUrl} className="w-full h-[450px] border-0 rounded" title="pdf" />;
    }
    if (ext === 'txt') {
      return (
        <div className="w-full bg-slate-900 text-white p-4 rounded text-left text-xs overflow-auto max-h-[300px] font-mono">
          {loadingText ? "Loading preview..." : <pre className="whitespace-pre-wrap break-all">{textPreview}</pre>}
        </div>
      );
    }
    return <p className="text-gray-500 py-6">No preview available for this file type.</p>;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between pt-2 pb-10 px-4 sm:px-6">
      {/* Brand Logo Header */}
      <div className="flex justify-center mb-2">
        <img src="/airshare-logo.png" alt="AirShare" className="h-16 sm:h-20 w-auto object-contain" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center max-w-2xl w-full mx-auto">
        {loading ? (
          <div className="text-gray-500 font-medium animate-pulse">Loading preview...</div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-md p-8 w-full text-center">
            <p className="text-gray-700 font-medium text-lg">{error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full text-center space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-all">{fileInfo.filename}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {formatBytes(fileInfo.size)} &bull; {fileInfo.extension.toUpperCase()}
              </p>
            </div>

            {/* Preview Box */}
            <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-2 flex justify-center">
              {renderPreview()}
            </div>

            {/* Expiry Warning */}
            {fileInfo.expiresAt && (
              <p className="text-xs text-red-500 font-medium">
                This link expires on {formatExpiry(fileInfo.expiresAt)}
              </p>
            )}

            {/* Download Button */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto px-10 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-blue-500/10"
              >
                Download File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-xs text-gray-400 font-medium">
        &copy; 2026 AirShare
      </div>
    </div>
  );
};

export default SharePreview;
