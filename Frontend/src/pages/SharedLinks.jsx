import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchShareLinks, deleteShareLink } from '../redux/slices/fileSlice';

const SharedLinks = () => {
  const { shareLinks, shareLoading } = useSelector((state) => state.files);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchShareLinks());
  }, [dispatch]);

  const handleDeleteShare = (token) => {
    if (window.confirm("Are you sure you want to delete this share link?")) {
      dispatch(deleteShareLink(token));
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shared Links</h1>
        <p className="mt-2 text-gray-600">View, copy, and manage the secure sharing links you have generated.</p>
      </div>

      <div className="card">
        {shareLoading && shareLinks.length === 0 ? (
          <div className="text-gray-500 py-6 text-center">Loading shared links...</div>
        ) : shareLinks.length === 0 ? (
          <div className="text-gray-500 py-6 text-center">No shared links created yet.</div>
        ) : (
          <div className="space-y-4">
            {shareLinks.map((share) => (
              <div key={share.token} className="rounded-2xl border border-gray-150 bg-gray-50/50 p-5 transition-all hover:bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">File ID</p>
                    <p className="font-medium text-gray-900 truncate mt-1">{share.fileId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Recipient</p>
                    <p className="font-medium text-gray-900 truncate mt-1">{share.recipientEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Access Count</p>
                    <p className="font-medium text-gray-900 mt-1">{share.accessCount} times</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Last Opened</p>
                    <p className="font-medium text-gray-900 mt-1">
                      {share.lastAccessedAt ? new Date(share.lastAccessedAt * 1000).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-gray-100">
                  <div className="break-all text-sm text-primary-600 font-mono select-all bg-white px-3 py-1.5 rounded-lg border border-gray-100 flex-1">
                    {share.shareUrl}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(share.shareUrl)}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleDeleteShare(share.token)}
                      className="btn-danger text-sm px-4 py-2"
                    >
                      Delete Link
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedLinks;
