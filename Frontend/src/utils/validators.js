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

// Username validation function matching backend requirements
export const validateUsername = (username) => {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return errors;
  }
  
  if (!/^[a-zA-Z0-9_]*$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
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
