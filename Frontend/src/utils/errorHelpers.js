import { addError, ERROR_TYPES, ERROR_SEVERITY } from '../redux/slices/errorSlice';
import { addSuccess } from '../redux/slices/successSlice';

// Error message mappings for better user experience
const ERROR_MESSAGES = {
  // Network errors
  'ERR_NETWORK': 'Unable to connect to server. Please check your internet connection.',
  'ERR_CONNECTION_REFUSED': 'Server is temporarily unavailable. Please try again later.',
  'ERR_TIMEOUT': 'Request timed out. Please try again.',

  // Authentication errors
  'INVALID_CREDENTIALS': 'Invalid username or password. Please check your credentials.',
  'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
  'UNAUTHORIZED': 'You are not authorized to perform this action.',

  // File errors
  'FILE_TOO_LARGE': 'File size exceeds the maximum limit of 100MB.',
  'INVALID_FILE_TYPE': 'This file type is not supported. Please upload a valid file.',
  'UPLOAD_FAILED': 'File upload failed. Please try again.',

  // Validation errors
  'VALIDATION_FAILED': 'Please check your input and try again.',
  'REQUIRED_FIELD': 'This field is required.',
  'INVALID_FORMAT': 'Please enter a valid format.',

  // Server errors
  'INTERNAL_SERVER_ERROR': 'Something went wrong on our end. Please try again later.',
  'SERVICE_UNAVAILABLE': 'Service is temporarily unavailable. Please try again later.',
};

// Get user-friendly error message
export const getUserFriendlyErrorMessage = (error) => {
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error;
  }

  if (error?.code) {
    return ERROR_MESSAGES[error.code] || error.message || 'An unexpected error occurred.';
  }

  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return error.response.data?.error || 'Invalid request. Please check your input.';
      case 401:
        return error.response.data?.error || 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return error.response.data?.error || 'Username not available.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.response.data?.error || 'An unexpected error occurred.';
    }
  }

  return error.message || 'An unexpected error occurred.';
};

// Determine error type based on error details
export const getErrorType = (error) => {
  if (error?.response?.status) {
    if (error.response.status === 401 || error.response.status === 403) {
      return ERROR_TYPES.AUTH;
    }
    if (error.response.status >= 500) {
      return ERROR_TYPES.SERVER;
    }
    if (error.response.status === 400) {
      return ERROR_TYPES.VALIDATION;
    }
  }

  if (error?.code === 'ERR_NETWORK') {
    return ERROR_TYPES.NETWORK;
  }

  if (error?.message?.toLowerCase().includes('file')) {
    return ERROR_TYPES.FILE;
  }

  return ERROR_TYPES.SERVER;
};

// Determine error severity
export const getErrorSeverity = (error) => {
  if (error?.response?.status) {
    if (error.response.status >= 500) {
      return ERROR_SEVERITY.HIGH;
    }
    if (error.response.status === 401 || error.response.status === 403) {
      return ERROR_SEVERITY.MEDIUM;
    }
    if (error.response.status === 400 || error.response.status === 409) {
      return ERROR_SEVERITY.MEDIUM;
    }
  }

  if (error?.code === 'ERR_NETWORK') {
    return ERROR_SEVERITY.HIGH;
  }

  return ERROR_SEVERITY.MEDIUM;
};

// Dispatch error helper function
export const dispatchError = (dispatch, error, source = 'Unknown') => {
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  const errorType = getErrorType(error);
  const severity = getErrorSeverity(error);

  dispatch(addError({
    message: friendlyMessage,
    type: errorType,
    severity: severity,
    source: source,
    details: {
      originalError: error?.message,
      statusCode: error?.response?.status,
      timestamp: new Date().toISOString(),
    },
  }));
};

// Dispatch success helper function
export const dispatchSuccess = (dispatch, message, type = 'general', duration = 3000) => {
  dispatch(addSuccess({
    message,
    type,
    duration,
  }));
};

// Retry helper for failed operations
export const createRetryHandler = (dispatch, operation, maxRetries = 3) => {
  return async (...args) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(...args);
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          dispatchError(dispatch, error, operation.name || 'Retry Operation');
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };
};