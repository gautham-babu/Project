// Enhanced error handling utilities

// Error types for better categorization
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown',
};

// Map HTTP status codes to error types
export const getErrorType = (status) => {
  if (!status) return ERROR_TYPES.NETWORK;
  
  if (status >= 400 && status < 500) {
    switch (status) {
      case 400: return ERROR_TYPES.VALIDATION;
      case 401: return ERROR_TYPES.AUTHENTICATION;
      case 403: return ERROR_TYPES.AUTHORIZATION;
      default: return ERROR_TYPES.CLIENT;
    }
  }
  
  if (status >= 500) return ERROR_TYPES.SERVER;
  return ERROR_TYPES.UNKNOWN;
};

// Enhanced error message mapping
export const getErrorMessage = (error, context = '') => {
  // If error is already a string, return it
  if (typeof error === 'string') return error;
  
  // Handle Axios error structure
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Handle network errors
  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  
  // Handle timeout errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Request timed out. The server might be busy, please try again.';
  }
  
  // Handle specific HTTP status codes
  const status = error?.response?.status;
  switch (status) {
    case 400:
      return error?.response?.data?.error || 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You don\'t have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return error?.response?.data?.error || 'A conflict occurred. The resource might already exist.';
    case 413:
      return 'File too large. Please select a smaller file (max 100MB).';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    case 500:
      return 'Server error occurred. Our team has been notified. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again in a few minutes.';
    default:
      break;
  }
  
  // Default fallback with context
  const baseMessage = error?.message || 'An unexpected error occurred';
  return context ? `${context}: ${baseMessage}` : baseMessage;
};

// Create user-friendly error object
export const createEnhancedError = (error, context = '', actionType = '') => {
  const errorType = getErrorType(error?.response?.status);
  const message = getErrorMessage(error, context);
  const status = error?.response?.status;
  
  return {
    message,
    type: errorType,
    status,
    context,
    actionType,
    timestamp: Date.now(),
    originalError: error,
    canRetry: shouldAllowRetry(error, errorType),
    retryDelay: getRetryDelay(errorType, status),
  };
};

// Determine if an error should allow retry
export const shouldAllowRetry = (error, errorType) => {
  // Don't retry validation, authentication, or authorization errors
  if ([ERROR_TYPES.VALIDATION, ERROR_TYPES.AUTHENTICATION, ERROR_TYPES.AUTHORIZATION].includes(errorType)) {
    return false;
  }
  
  // Allow retry for network, server errors, and specific client errors
  const status = error?.response?.status;
  if (status === 429 || status >= 500) return true; // Rate limit or server error
  if (errorType === ERROR_TYPES.NETWORK) return true; // Network issues
  
  return false;
};

// Get appropriate retry delay based on error type
export const getRetryDelay = (errorType, status) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return 2000; // 2 seconds for network errors
    case ERROR_TYPES.SERVER:
      return 5000; // 5 seconds for server errors
    default:
      break;
  }
  
  // Special handling for rate limiting
  if (status === 429) return 60000; // 1 minute for rate limit
  
  return 3000; // Default 3 seconds
};

// Validation helper for form errors
export const createValidationErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.map(error => ({
      message: error,
      type: ERROR_TYPES.VALIDATION,
    }));
  }
  
  if (typeof errors === 'object') {
    return Object.entries(errors).map(([field, message]) => ({
      message: `${field}: ${message}`,
      type: ERROR_TYPES.VALIDATION,
      field,
    }));
  }
  
  return [{
    message: errors,
    type: ERROR_TYPES.VALIDATION,
  }];
};
