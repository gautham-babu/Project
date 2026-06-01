import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { resetPassword, verifyResetToken } from '../redux/slices/authSlice';
import { validatePassword, getPasswordStrength } from '../utils/validators';

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [tokenIsValid, setTokenIsValid] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useParams();

  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Verify the link once, then keep the token in state.
    const performVerification = async () => {
      if (token) {
        try {
          await dispatch(verifyResetToken(token)).unwrap();
          setResetToken(token);
          setTokenIsValid(true);
        } catch (err) {
          setServerError(err || 'This reset link has expired or is invalid.');
          setTokenIsValid(false);
        } finally {
          setVerifying(false);
          // Hide the token from the address bar after it is checked.
          navigate('/reset-password', { replace: true });
        }
      } else if (!resetToken) {
        setServerError('Password reset link has expired. Please request a new one.');
        setVerifying(false);
        setTokenIsValid(false);
      }
    };
    performVerification();
  }, [token, navigate, dispatch, resetToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (validationErrors[name] || serverError) {
      setValidationErrors({
        ...validationErrors,
        [name]: null,
      });
      setServerError(null);
    }

    if (name === 'password') {
      // Match the signup password feedback.
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const validateForm = () => {
    const errors = {};

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors.join('. ');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resetToken) {
      // This can happen if someone opens /reset-password directly.
      setServerError('Reset token is missing from the URL. Please request a new link.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setServerError(null);

    try {
      await dispatch(resetPassword({ token: resetToken, password: formData.password })).unwrap();
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setServerError(err || 'Failed to reset password.');
    }
  };

  return (
    <div 
      className="min-h-[calc(100vh-4rem)] flex items-start justify-center lg:justify-start pt-12 sm:pt-20 lg:pt-32 py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: 'url(/bg-pattern.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-sm w-full lg:ml-32 animate-fadeIn">
        <div className="card backdrop-blur-sm bg-white/85 shadow-2xl">
          {verifying ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Verifying your reset link...</p>
            </div>
          ) : !tokenIsValid ? (
            <div className="text-center py-4">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Verification Failed</h3>
              <p className="text-sm text-red-600 mb-6 font-medium">{serverError || 'The reset link is invalid or expired.'}</p>
              <div className="space-y-3">
                <Link to="/forgot-password" className="block w-full btn-primary text-center text-sm">
                  Request New Reset Link
                </Link>
                <Link to="/login" className="block text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
                <p className="mt-2 text-gray-600">Enter your new password below</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className={`input-field font-normal ${validationErrors.password ? 'border-red-500' : ''}`}
                    placeholder="Enter a strong password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  {passwordStrength && formData.password && (
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
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
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
                    required
                    className={`input-field font-normal ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                {serverError && (
                  <p className="text-sm text-red-600 text-center font-medium">
                    {serverError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting password...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                <div className="text-center mt-4">
                  <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
