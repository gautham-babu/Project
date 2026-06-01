import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getUserInfo, updatePassword, deleteAccount } from '../redux/slices/authSlice';
import { validatePassword, getPasswordStrength } from '../utils/validators';
import apiClient from '../redux/api/apiClient';

const Profile = () => {
  const { user, profile, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [currentTime] = useState(() => Date.now());
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    dispatch(getUserInfo());
  }, [dispatch]);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Not available';
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAccountAge = (createdAt) => {
    if (!createdAt) return 'Just created';

    const createdDate = new Date(createdAt * 1000);
    const diffMs = currentTime - createdDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) return 'Created today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;

    const diffYears = Math.floor(diffDays / 365);
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value,
    });

    if (name === 'currentPassword') {
      // Reset verification if user edits the current password
      setCurrentPasswordVerified(false);
      setVerifyError(null);
    }

    if (validationErrors[name] || serverError || successMessage) {
      setValidationErrors({
        ...validationErrors,
        [name]: null,
      });
      setServerError(null);
      setSuccessMessage(null);
    }

    if (name === 'newPassword') {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const handleVerifyCurrentPassword = async () => {
    if (!passwordData.currentPassword) {
      setVerifyError('Please enter your current password.');
      return;
    }
    setVerifyingPassword(true);
    setVerifyError(null);
    try {
      await apiClient.post('/api/verify-password', {
        currentPassword: passwordData.currentPassword,
      });
      setCurrentPasswordVerified(true);
    } catch (err) {
      setVerifyError(
        err.response?.data?.error || 'Incorrect password. Please try again.'
      );
    } finally {
      setVerifyingPassword(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    const passwordErrors = validatePassword(passwordData.newPassword);
    if (passwordErrors.length > 0) {
      errors.newPassword = passwordErrors.join('. ');
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    const result = await dispatch(updatePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    }));
    if (result.type === 'auth/updatePassword/fulfilled') {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(null);
      setSuccessMessage('Password changed successfully');
      setServerError(null);
      return;
    }

    setServerError(result.payload || result.error?.message || 'Password update failed');
  };

  const handleDeleteAccount = async () => {
    const result = await dispatch(deleteAccount());
    if (result.type === 'auth/deleteAccount/fulfilled') {
      navigate('/login');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account settings</p>
      </div>

      <div className="space-y-6">
        {/* User Info Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-3 rounded-xl">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{user}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(profile?.dateOfBirth)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatAccountAge(profile?.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>

          {/* Step 1: Verify current password */}
          <div className="space-y-3">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                className={`input-field ${verifyError ? 'border-red-500' : currentPasswordVerified ? 'border-green-500' : ''}`}
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                disabled={currentPasswordVerified}
              />
              {verifyError && (
                <p className="mt-1 text-sm text-red-600">{verifyError}</p>
              )}
              {currentPasswordVerified && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Password verified
                </p>
              )}
            </div>

            {!currentPasswordVerified && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleVerifyCurrentPassword}
                disabled={verifyingPassword || !passwordData.currentPassword}
              >
                {verifyingPassword ? 'Verifying...' : 'Continue'}
              </button>
            )}
          </div>

          {/* Step 2: Set new password — shown only after verification */}
          {currentPasswordVerified && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-6 animate-fadeIn">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  className={`input-field ${validationErrors.newPassword ? 'border-red-500' : ''}`}
                  placeholder="Enter new password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                />
                {passwordStrength && passwordData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordStrength.strength === 'strong'
                              ? 'bg-green-500 w-full'
                              : passwordStrength.strength === 'medium'
                              ? 'bg-yellow-500 w-2/3'
                              : 'bg-red-500 w-1/3'
                          }`}
                        ></div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength.strength === 'strong'
                            ? 'text-green-600'
                            : passwordStrength.strength === 'medium'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {passwordStrength.text}
                      </span>
                    </div>
                  </div>
                )}
                {validationErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className={`input-field ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="Re-enter new password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                )}
                {serverError && (
                  <p className="mt-1 text-sm text-red-600">{serverError}</p>
                )}
                {successMessage && (
                  <p className="mt-1 text-sm text-green-600">{successMessage}</p>
                )}
              </div>

              <div className="flex flex-col xs:flex-row gap-3">
                <button
                  type="submit"
                  className="btn-primary w-full xs:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                  onClick={() => {
                    setCurrentPasswordVerified(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordStrength(null);
                    setServerError(null);
                    setSuccessMessage(null);
                    setValidationErrors({});
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Delete Account */}
        <div className="card border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Delete Account</h2>
          <p className="text-sm text-gray-600 mb-6">
            Permanently delete your account and all associated data, including uploaded files and shared links. This action is irreversible.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-semibold rounded-xl text-sm transition-all duration-200 shadow-sm"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4 max-w-xl animate-fadeIn">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-semibold">Important security confirmation</p>
                  <p className="mt-1">
                    You are about to permanently delete your account. All uploaded files and share links will be deleted immediately and cannot be recovered.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmUsername" className="block text-sm font-medium text-gray-700">
                  To confirm, type your username <span className="font-bold text-gray-900">"{user}"</span> below:
                </label>
                <input
                  id="confirmUsername"
                  type="text"
                  className="input-field"
                  placeholder={user}
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDeleteAccount}
                  className={`px-5 py-2.5 font-semibold rounded-xl text-sm transition-all duration-200 shadow-sm ${
                    confirmUsername === user && !loading
                      ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                  disabled={confirmUsername !== user || loading}
                >
                  {loading ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setConfirmUsername('');
                  }}
                  className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-all duration-200 shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
