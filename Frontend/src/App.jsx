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

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
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
          </Route>
          <Route path="share/:token" element={<SharePreview />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        
        {/*Toast Notifications*/}
        <ToastContainer />
      </Router>
    </Provider>
  );
}

export default App
