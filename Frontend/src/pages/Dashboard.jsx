import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { getUserInfo } from '../redux/slices/authSlice';
import apiClient from '../redux/api/apiClient';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [userStats, setUserStats] = useState({ storage_used_mb: 0, file_count: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const MAX_STORAGE_GB = 1;
  const MAX_STORAGE_MB = MAX_STORAGE_GB * 1024;
  const storagePercentage = Math.min((userStats.storage_used_mb / MAX_STORAGE_MB) * 100, 100);

  useEffect(() => {
    dispatch(getUserInfo());
  }, [dispatch]);

  useEffect(() => {
    // Stats are separate from profile data, so fetch them after login is known.
    const fetchUserStats = async () => {
      try {
        setStatsLoading(true);
        const response = await apiClient.get('/user/stats');
        setUserStats(response.data);
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
        setUserStats({ storage_used_mb: 0, file_count: 0 });
      } finally {
        setStatsLoading(false);
      }
    };

    if (user) {
      fetchUserStats();
    }
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user}!</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main file library shortcut. */}
        <Link to="/files" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-start space-x-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Your Files</h3>
              <p className="mt-1 text-sm text-gray-600">
                View and manage your uploaded files
              </p>
            </div>
          </div>
        </Link>

        {/* Sharing history shortcut. */}
        <Link to="/shares" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Shared Links</h3>
              <p className="mt-1 text-sm text-gray-600">
                View and manage your active shared file links
              </p>
            </div>
          </div>
        </Link>

        {/* Quick storage snapshot. */}
        <div className="card bg-gradient-to-br from-primary-50 to-blue-50">
          <div className="flex items-start space-x-4">
            <div className="bg-white p-3 rounded-xl">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Your Storage</h3>
              <p className="mt-2 text-sm text-gray-600">
                {statsLoading ? 'Loading...' : `${userStats.storage_used_mb} MB / ${MAX_STORAGE_MB} MB`}
              </p>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    storagePercentage > 90
                      ? 'bg-red-500'
                      : storagePercentage > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${storagePercentage}%` }}
                ></div>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {statsLoading ? 'Loading...' : `Files uploaded: ${userStats.file_count}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="btn-primary inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload File
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;