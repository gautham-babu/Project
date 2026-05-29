import { Toaster } from 'react-hot-toast';

const ToastContainer = () => {
  return (
    <Toaster
      position="bottom-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{bottom: 24, right: 24}}
      toastOptions={{
        // Default
        duration: 4000,
        style: {
          background: 'white',
          color: '#374151',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '16px',
          fontSize: '14px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        // Success
        success: {
          duration: 4000,
          style: {
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
          },
          iconTheme: {
            primary: '#16a34a',
            secondary: '#f0fdf4',
          },
        },
        // Error 
        error: {
          duration: 6000,
          style: {
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
          },
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fef2f2',
          },
        },
        // Loading 
        loading: {
          duration: Infinity,
          style: {
            background: '#fefbeb',
            border: '1px solid #fed7aa',
            color: '#d97706',
          },
        },
      }}
    />
  );
};

export default ToastContainer;
