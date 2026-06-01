import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import FileManager from './pages/FileManager';
import SharePreview from './pages/SharePreview';
import UploadFiles from './pages/UploadFiles';
import SharedLinks from './pages/SharedLinks';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Provider store={store}>
      <Router>
        {/*App routes*/}
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="reset-password/:token" element={<ResetPassword />} />
            <Route
              path="dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            <Route
              path="files"
              element={
                <PrivateRoute>
                  <FileManager />
                </PrivateRoute>
              }
            />
            <Route
              path="upload"
              element={
                <PrivateRoute>
                  <UploadFiles />
                </PrivateRoute>
              }
            />
            <Route
              path="shares"
              element={
                <PrivateRoute>
                  <SharedLinks />
                </PrivateRoute>
              }
            />
          </Route>
          <Route path="share/:token" element={<SharePreview />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        {/* One global place for in-app messages. */}
        <ToastContainer />
      </Router>
    </Provider>
  );
}

export default App