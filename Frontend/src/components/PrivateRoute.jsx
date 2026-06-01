import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Send guests back to sign in
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
