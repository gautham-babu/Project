// Password validation function matching backend requirements
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return errors;
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must include a number');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include an uppercase letter');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must include a special character (!@#$%^&*)');
  }
  
  if (!/^[a-zA-Z0-9!@#$%^&*_ -]*$/.test(password)) {
    errors.push('Password contains illegal characters');
  }
  
  return errors;
};

export const validateName = (name, fieldName) => {
  const errors = [];
  
  if (!name?.trim()) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  if (!/^[a-zA-Z ]{2,50}$/.test(name.trim())) {
    errors.push(`${fieldName} can only contain letters and spaces`);
  }
  
  return errors;
};

export const validateEmail = (email) => {
  const errors = [];
  
  if (!email?.trim()) {
    errors.push('Email address is required');
    return errors;
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Please enter a valid email address');
  }
  
  return errors;
};

export const validateDateOfBirth = (dateOfBirth) => {
  const errors = [];
  
  if (!dateOfBirth) {
    errors.push('Date of birth is required');
  }
  
  return errors;
};

// File validation
export const validateFile = (file) => {
  const errors = [];
  const allowedTypes = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'docx', 'mp4', 'mov', 'mkv'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (!file) {
    errors.push('Please select a file');
    return errors;
  }
  
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    errors.push(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    errors.push('File size exceeds 100MB limit');
  }
  
  return errors;
};

// Password strength indicator
export const getPasswordStrength = (password) => {
  const errors = validatePassword(password);
  
  if (errors.length === 0) return { strength: 'strong', color: 'green', text: 'Strong' };
  if (errors.length <= 2) return { strength: 'medium', color: 'yellow', text: 'Medium' };
  return { strength: 'weak', color: 'red', text: 'Weak' };
};
