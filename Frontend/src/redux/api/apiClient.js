import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:5000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.post(
            `${API_BASE_URL}/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const newToken = response.data.token;
          localStorage.setItem('token', newToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Token refresh failed, clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('displayName');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
