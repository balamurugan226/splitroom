export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePassword = (pw) => pw && pw.length >= 6;

export const validatePhone = (phone) =>
  !phone || /^[6-9]\d{9}$/.test(phone);

export const validateAmount = (amount) =>
  !isNaN(amount) && Number(amount) > 0;

export const required = (val) =>
  val !== undefined && val !== null && val !== '';

export const getPasswordStrength = (password) => {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
};

export const getPasswordStrengthLabel = (strength) => {
  if (strength <= 1) return { label: 'Weak', color: '#ef4444' };
  if (strength <= 3) return { label: 'Fair', color: '#f59e0b' };
  if (strength <= 4) return { label: 'Good', color: '#10b981' };
  return { label: 'Strong', color: '#059669' };
};
