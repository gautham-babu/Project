import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { dispatchError, dispatchSuccess } from '../utils/errorHelpers';

export const useNotifications = () => {
  const dispatch = useDispatch();

  // Show success notification
  const notifySuccess = (message, duration = 3000) => {
    dispatchSuccess(dispatch, message, 'general', duration);
    return toast.success(message, { duration });
  };

  // Show error notification with enhanced error handling
  const notifyError = (error, context = '', options = {}) => {
    dispatchError(dispatch, error, context);
    
    // Create custom toast with retry button if applicable
    if (options.onRetry) {
      toast.error((t) => (
        <div className="flex flex-col space-y-2">
          <div>{typeof error === 'string' ? error : error.message || 'An error occurred'}</div>
          <button
            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg transition-colors"
            onClick={() => {
              toast.dismiss(t.id);
              options.onRetry();
            }}
          >
            Retry
          </button>
        </div>
      ), {
        duration: 5000,
      });
    } else {
      const errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred';
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  // Show warning notification
  const notifyWarning = (message, duration = 4000) => {
    toast(() => (
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 text-yellow-500">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>{message}</div>
      </div>
    ), {
      duration,
      style: {
        background: '#fefbeb',
        border: '1px solid #fed7aa',
        color: '#d97706',
      },
    });
  };

  // Show info notification
  const notifyInfo = (message, duration = 4000) => {
    toast(() => (
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 text-blue-500">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div>{message}</div>
      </div>
    ), {
      duration,
      style: {
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        color: '#1d4ed8',
      },
    });
  };

  // Show loading notification
  const notifyLoading = (message) => {
    return toast.loading(message, {
      style: {
        background: '#fefbeb',
        border: '1px solid #fed7aa',
        color: '#d97706',
      },
    });
  };

  // Dismiss specific notification
  const dismissNotification = (toastId) => {
    toast.dismiss(toastId);
  };

  // Dismiss all notifications
  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyLoading,
    dismissNotification,
    dismissAll,
  };
};

// Hook for handling API errors consistently
export const useApiErrorHandler = () => {
  const { notifyError } = useNotifications();

  const handleApiError = (error, context = '', onRetry = null) => {
    return notifyError(error, context, { onRetry });
  };

  return { handleApiError };
};
