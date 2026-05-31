import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchShareLinks, deleteShareLink } from '../redux/slices/fileSlice';
import ConfirmModal from '../components/ConfirmModal';

const SharedLinks = () => {
  const { shareLinks, shareLoading } = useSelector((state) => state.files);
  const dispatch = useDispatch();

  const [confirmToken, setConfirmToken] = useState(null); // token of link to delete
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    dispatch(fetchShareLinks());
  }, [dispatch]);

  const handleDeleteShare = (token) => {
    setConfirmToken(token); // open modal
  };

  const handleConfirmDelete = () => {
    if (confirmToken) {
      dispatch(deleteShareLink(confirmToken));
    }
    setConfirmToken(null);
  };

  const copyToClipboard = async (text, token) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  // Sort share links list-wise according to the date they have been shared (descending order)
  const sortedShares = [...shareLinks].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const getShareDate = (timestamp) => {
    if (!timestamp) return 'Unknown Date';
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Group sorted shares by date, maintaining order
  const shareGroups = [];
  sortedShares.forEach((share) => {
    const dateStr = getShareDate(share.createdAt);
    let group = shareGroups.find((g) => g.date === dateStr);
    if (!group) {
      group = { date: dateStr, items: [] };
      shareGroups.push(group);
    }
    group.items.push(share);
  });

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
          <div className="space-y-8">
            {shareGroups.map((group) => (
              <div key={group.date} className="space-y-4">
                {/* Date Group Heading */}
                <h3 className="text-lg font-bold text-gray-800 border-b border-gray-150 pb-2 mb-3 mt-4">
                  {group.date}
                </h3>

                <div className="space-y-4">
                  {group.items.map((share) => (
                    <div key={share.token} className="rounded-2xl border border-gray-150 bg-gray-50/50 p-5 transition-all hover:bg-gray-50">
                      {/* Top Row: File details on left, time shared on right */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                          <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">File Name</p>
                            <p className="font-medium text-gray-900 truncate mt-1 max-w-[200px]" title={share.fileName}>{share.fileName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Recipient</p>
                            <p className="font-medium text-gray-900 truncate mt-1" title={share.recipientEmail}>{share.recipientEmail}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Access Count</p>
                            <p className="font-medium text-gray-900 mt-1">{share.accessCount} times</p>
                          </div>
                        </div>

                        {/* Time Shared in the right of the file */}
                        <div className="text-left sm:text-right sm:min-w-[120px]">
                          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Time Shared</p>
                          <p className="font-semibold text-gray-800 mt-1">
                            {share.createdAt ? new Date(share.createdAt * 1000).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : 'Not available'}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Row: Copy URL and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-gray-100">
                        <div className="break-all text-sm text-primary-600 font-mono select-all bg-white px-3 py-1.5 rounded-lg border border-gray-100 flex-1">
                          {share.shareUrl}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(share.shareUrl, share.token)}
                            className="btn-secondary text-sm px-4 py-2"
                          >
                            {copiedToken === share.token ? 'Copied!' : 'Copy Link'}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-app delete confirmation modal */}
      <ConfirmModal
        isOpen={!!confirmToken}
        title="Delete Share Link"
        message="Are you sure you want to delete this share link? Anyone with the link will lose access immediately."
        confirmText="Delete Link"
        cancelText="Cancel"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmToken(null)}
      />
    </div>
  );
};

export default SharedLinks;
