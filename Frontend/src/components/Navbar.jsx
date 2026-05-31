import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useState } from 'react';
import { logout } from '../redux/slices/authSlice';

const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center">
              <img
                src="/airshare-logo.png"
                alt="AirShare"
                className="h-12 sm:h-16 lg:h-20 w-auto object-contain hover:scale-105 transition-transform duration-200"
              />
            </Link>

            {/*for Desktop -Hidden on mobile*/}
            {isAuthenticated && (
              <div className="hidden md:flex ml-10 space-x-4">
                 <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/files"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Your Files
                </Link>
                <Link
                  to="/upload"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Upload Files
                </Link>
                <Link
                  to="/shares"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Shared Links
                </Link>
                <Link
                  to="/profile"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/*User welcome-Hidden on small screens*/}
                <span className="text-gray-700 text-sm hidden lg:inline">
                  Welcome, <span className="font-semibold">{user}</span>
                </span>

                {/*Hamburger Menu Button-for mobile*/}
                <button
                  onClick={toggleMobileMenu}
                  className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>

                {/*Logout button*/}
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/*Mobile menu-Only shown when hamburger is clicked*/}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
             <Link
              to="/dashboard"
              className="block text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-base font-medium"
              onClick={closeMobileMenu}
            >
              Dashboard
            </Link>
            <Link
              to="/files"
              className="block text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-base font-medium"
              onClick={closeMobileMenu}
            >
              Your Files
            </Link>
            <Link
              to="/upload"
              className="block text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-base font-medium"
              onClick={closeMobileMenu}
            >
              Upload Files
            </Link>
            <Link
              to="/shares"
              className="block text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-base font-medium"
              onClick={closeMobileMenu}
            >
              Shared Links
            </Link>
            <Link
              to="/profile"
              className="block text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg text-base font-medium"
              onClick={closeMobileMenu}
            >
              Profile
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
