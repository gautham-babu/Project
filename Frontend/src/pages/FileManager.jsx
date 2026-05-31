import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { downloadFile, deleteFile, fetchUserFiles, createShareLink, fetchShareLinks } from '../redux/slices/fileSlice';
import ConfirmModal from '../components/ConfirmModal';

const FileManager = () => {
  const { uploadedFiles, loading, shareLinks } = useSelector((state) => state.files);
  const dispatch = useDispatch();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shareModalFile, setShareModalFile] = useState(null);
  const [shareRecipient, setShareRecipient] = useState('');
  const [shareExpiry, setShareExpiry] = useState(24);
  const [shareError, setShareError] = useState(null);
  const [shareResult, setShareResult] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { file, isShared }
  const itemsPerPage = 5;

  useEffect(() => {
    dispatch(fetchUserFiles());
    dispatch(fetchShareLinks());
  }, [dispatch]);

  const handleDownload = (file) => {
    dispatch(downloadFile({ id: file.id, original_name: file.original_name }));
  };

  const handleDelete = (file) => {
    const isShared = shareLinks && shareLinks.some((link) => link.fileId === file.id);
    setConfirmModal({ file, isShared });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal) return;
    const { file } = confirmModal;
    setConfirmModal(null);
    const result = await dispatch(deleteFile(file.id));
    if (result.type === 'files/deleteFile/fulfilled') {
      setCurrentPage(1);
      dispatch(fetchUserFiles());
      dispatch(fetchShareLinks());
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const openShareModal = (file) => {
    setShareModalFile(file);
    setShareRecipient('');
    setShareExpiry(24);
    setShareError(null);
    setShareResult(null);
  };

  const closeShareModal = () => {
    setShareModalFile(null);
    setShareRecipient('');
    setShareExpiry(24);
    setShareError(null);
    setShareResult(null);
  };

  const handleShareSubmit = async () => {
    if (!shareRecipient.trim() || !validateEmail(shareRecipient.trim())) {
      setShareError('Please enter a valid recipient email address.');
      return;
    }

    if (!shareModalFile) return;

    const result = await dispatch(
      createShareLink({
        fileId: shareModalFile.id,
        recipientEmail: shareRecipient.trim(),
        expiresInHours: shareExpiry,
      })
    );

    if (result.type === 'files/createShareLink/fulfilled') {
      setShareResult(result.payload);
      setShareError(null);
    } else {
      setShareError(result.payload || 'Unable to create a share link.');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Filter files by search query and sort by upload date descending
  const filteredFiles = uploadedFiles
    .filter((file) =>
      file.original_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice()
    .sort((a, b) => (b.uploaded_at || 0) - (a.uploaded_at || 0));

  const getFileDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFileTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Group all filtered files by date
  const fileGroups = [];
  filteredFiles.forEach((file) => {
    const dateStr = getFileDate(file.uploaded_at);
    let group = fileGroups.find((g) => g.date === dateStr);
    if (!group) {
      group = { date: dateStr, items: [] };
      fileGroups.push(group);
    }
    group.items.push(file);
  });

  // Pagination — paginate across all filtered files (not groups)
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + itemsPerPage);
  const paginatedIds = new Set(paginatedFiles.map((f) => f.id));

  // Keep only groups (and items within) that appear on the current page
  const paginatedGroups = fileGroups
    .map((g) => ({ ...g, items: g.items.filter((f) => paginatedIds.has(f.id)) }))
    .filter((g) => g.items.length > 0);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Files</h1>
        <p className="mt-2 text-gray-600">View, download, delete and share your files.</p>
      </div>

      {/* Files Section */}
      <div className="card">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Files List</h2>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search files..."
              className="input-field"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {loading && uploadedFiles.length === 0 ? (
          <div className="text-gray-500 py-6 text-center">Loading files...</div>
        ) : paginatedFiles.length === 0 ? (
          <div className="text-gray-500 py-6 text-center">
            {searchQuery ? 'No files match your search.' : 'No files uploaded yet.'}
          </div>
        ) : (
          <div className="space-y-8">
            {paginatedGroups.map((group) => (
              <div key={group.date} className="space-y-4">
                {/* Date Heading */}
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-150 pb-2 mb-3 mt-4">
                  {group.date}
                </h3>

                <div className="space-y-3">
                  {group.items.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-2xl border border-gray-150 bg-gray-50/50 p-5 transition-all hover:bg-gray-50"
                    >
                      {/* Top row: file info left, time right */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                          {/* File name */}
                          <div className="flex items-center space-x-3 min-w-0">
                            <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">File Name</p>
                              <p className="text-sm font-medium text-gray-900 truncate" title={file.original_name}>
                                {file.original_name}
                              </p>
                            </div>
                          </div>
                          {/* Size */}
                          <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Size</p>
                            <p className="text-sm font-medium text-gray-900">{formatFileSize(file.size)}</p>
                          </div>
                        </div>

                        {/* Time Uploaded — right side */}
                        <div className="text-left sm:text-right sm:min-w-[120px]">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Time Uploaded</p>
                          <p className="font-semibold text-gray-800 mt-1">{getFileTime(file.uploaded_at)}</p>
                        </div>
                      </div>

                      {/* Bottom row: action buttons */}
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleDownload(file)}
                          className="btn-primary text-sm px-4 py-2"
                          disabled={loading || !file.accessible}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => openShareModal(file)}
                          className="btn-secondary text-sm px-4 py-2"
                          disabled={loading || !file.accessible}
                        >
                          Share
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="btn-danger text-sm px-4 py-2"
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-150">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredFiles.length)} of {filteredFiles.length} files
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Link Modal */}
      {shareModalFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeShareModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4 sm:p-8 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Share file</h3>
                    <p className="mt-1 text-sm text-gray-500">Send a secure share link to a recipient email.</p>
                  </div>
                  <button
                    onClick={closeShareModal}
                    className="text-gray-400 hover:text-gray-500 p-1"
                    aria-label="Close share modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 font-semibold uppercase">File to Share</p>
                    <p className="font-medium text-gray-900 mt-1">{shareModalFile.original_name}</p>
                  </div>

                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Email
                    </label>
                    <input
                      id="recipient"
                      type="email"
                      placeholder="Enter the email address"
                      className="input-field"
                      value={shareRecipient}
                      onChange={(e) => setShareRecipient(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
                      Link Expiry
                    </label>
                    <select
                      id="expiry"
                      className="input-field bg-white"
                      value={shareExpiry}
                      onChange={(e) => setShareExpiry(Number(e.target.value))}
                    >
                      <option value={1}>1 hour</option>
                      <option value={24}>1 day</option>
                      <option value={168}>7 days</option>
                    </select>
                  </div>

                  {shareError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                      {shareError}
                    </div>
                  )}

                  {shareResult && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">Link sent successfully!</p>
                        <p className="mt-1 text-green-700">
                          The share link has been sent to <span className="font-medium">{shareRecipient}</span>. They can use it to access the file.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:py-6 flex justify-end space-x-2">
                <button
                  onClick={closeShareModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareSubmit}
                  className="btn-primary"
                  disabled={shareResult && !!shareResult.shareUrl}
                >
                  {shareResult ? 'Shared' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app delete confirmation modal */}
      <ConfirmModal
        isOpen={!!confirmModal}
        title="Delete File"
        message={
          confirmModal?.isShared
            ? 'This file has active shared links. Deleting it will also permanently remove all its shared links. This action cannot be undone.'
            : 'Are you sure you want to permanently delete this file? This action cannot be undone.'
        }
        confirmText="Delete File"
        cancelText="Cancel"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
};

export default FileManager;
