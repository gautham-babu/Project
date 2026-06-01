import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, sendOtp } from '../redux/slices/authSlice';
import {
  validateDateOfBirth,
  validateEmail,
  validateName,
  validatePassword,
  getPasswordStrength,
} from '../utils/validators';
import Datepicker from "react-tailwindcss-datepicker";

const Register = () => {
  // Signup is a two-part process: email OTP first, account creation second.
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, otpLoading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Basic resend timer for the email code.
    let interval = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSendOtp = async () => {
    // The backend only needs the normalized email for OTP.
    const emailErrors = validateEmail(formData.email);
    if (emailErrors.length > 0) {
      setValidationErrors({
        ...validationErrors,
        email: emailErrors[0]
      });
      return;
    }

    setServerError(null);
    const result = await dispatch(sendOtp(formData.email.trim().toLowerCase()));
    if (result.type === 'auth/sendOtp/fulfilled') {
      setOtpSent(true);
      setCountdown(60);
    } else {
      setServerError(result.payload || 'Failed to send verification email.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear stale messages as soon as the user fixes a field.
    if (validationErrors[name] || serverError) {
      setValidationErrors({
        ...validationErrors,
        [name]: null,
      });
      setServerError(null);
    }

    // Give instant password feedback.
    if (name === 'password') {
      setPasswordStrength(getPasswordStrength(value));
    }
  };

  const validateForm = () => {
    // Build one error object so all field messages update together.
    const errors = {};

    const firstNameErrors = validateName(formData.firstName, 'First name');
    if (firstNameErrors.length > 0) {
      errors.firstName = firstNameErrors[0];
    }

    const lastNameErrors = validateName(formData.lastName, 'Last name');
    if (lastNameErrors.length > 0) {
      errors.lastName = lastNameErrors[0];
    }

    const emailErrors = validateEmail(formData.email);
    if (emailErrors.length > 0) {
      errors.email = emailErrors[0];
    }

    // Email must be verified before registration.
    if (!otpSent) {
      errors.email = 'Please verify your email address first';
    } else if (!formData.otp || formData.otp.trim().length !== 6) {
      errors.otp = 'Please enter the 6-digit verification code';
    }

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors.join('. ');
    }

    // Keep the two password fields in sync.
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    const dateOfBirthErrors = validateDateOfBirth(formData.dateOfBirth);
    if (dateOfBirthErrors.length > 0) {
      errors.dateOfBirth = dateOfBirthErrors[0];
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await dispatch(register({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      otp: formData.otp.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      dateOfBirth: formData.dateOfBirth,
    }));

    if (result.type === 'auth/register/fulfilled') {
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }

    const errorMessage = result.payload || result.error?.message || 'Registration failed';
    setServerError(errorMessage);
  };

  return (
    <div 
      className="min-h-[calc(100vh-4rem)] flex items-start justify-center lg:justify-start pt-8 sm:pt-12 lg:pt-16 py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: 'url(/bg-pattern.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-md w-full lg:ml-32 animate-fadeIn">
        <div className="card backdrop-blur-sm bg-white/85 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Sign Up</h2>
            <p className="mt-2 text-gray-600">Your files, everywhere you go</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className={`input-field ${validationErrors.firstName ? 'border-red-500' : ''}`}
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                {validationErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className={`input-field ${validationErrors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                {validationErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                )}
              </div>
            </div>

             <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={otpSent && countdown > 0}
                  className={`input-field flex-grow ${validationErrors.email ? 'border-red-500' : ''}`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || countdown > 0 || !formData.email}
                  className="btn-secondary whitespace-nowrap text-sm px-4 py-2 min-w-[110px]"
                >
                  {otpLoading ? (
                    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : otpSent ? (
                    'Resend Code'
                  ) : (
                    'Send Code'
                  )}
                </button>
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            {otpSent && (
              <div className="animate-fadeIn">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code (OTP)
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength={6}
                  className={`input-field text-md tracking-widest ${validationErrors.otp ? 'border-red-500' : ''}`}
                  placeholder="6-digit OTP"
                  value={formData.otp}
                  onChange={handleChange}
                />
                {validationErrors.otp && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.otp}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Please enter the 6-digit code sent to your email address.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`input-field font-normal ${validationErrors.password ? 'border-red-500' : ''}`}
                placeholder="Create a strong password"
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
              <p className="mt-1 text-xs text-gray-500">
                Min 8 chars, with uppercase, number, and special char (!@#$%^&*)
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className={`input-field font-normal ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <div className={`relative ${validationErrors.dateOfBirth ? 'border border-red-500 rounded-md' : ''}`}>
                <Datepicker
                  useRange={false} 
                  asSingle={true} 
                  value={{ startDate: formData.dateOfBirth, endDate: formData.dateOfBirth }}
                  onChange={(newValue) => {
                    let finalDate = "";
                    
                    if (newValue && newValue.startDate) {
                      // Normalize the picker value for the backend.
                      const selectedDate = new Date(newValue.startDate);
                      
                      const year = selectedDate.getFullYear();
                      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(selectedDate.getDate()).padStart(2, '0');
                      
                      finalDate = `${year}-${month}-${day}`;
                    }

                    setFormData({ ...formData, dateOfBirth: finalDate });
                    
                    if (validationErrors.dateOfBirth || serverError) {
                      setValidationErrors({ ...validationErrors, dateOfBirth: null });
                      setServerError(null);
                    }
                  }}
                  displayFormat={"DD/MM/YYYY"}
                  placeholder="dd/mm/yyyy"
                  inputClassName="input-field w-full" 
                />
              </div>
              {validationErrors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.dateOfBirth}</p>
              )}
            </div>

            {serverError && (
              <p className="mt-2 text-sm text-red-600 text-center">
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
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;