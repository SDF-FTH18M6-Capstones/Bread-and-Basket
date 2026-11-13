const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{9,15}$/; // same rule as the API contract

export const cleanPhone = (phone) => phone.replace(/[\s-]/g, "");

function checkEmail(email) {
  const value = email.trim();
  if (!value) return "Enter your email.";
  if (!EMAIL_RE.test(value))
    return "Enter a valid email, like name@example.com.";
  if (value.length > 120) return "Email is too long (120 characters at most).";
  return null;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export function validateRegister({ full_name, phone, email, password }) {
  const errors = {};

  const name = full_name.trim();
  if (!name) errors.full_name = "Enter your full name.";
  else if (name.length < 2) errors.full_name = "Your name is too short.";
  else if (name.length > 120)
    errors.full_name = "Your name is too long (120 characters at most).";

  const digits = cleanPhone(phone);
  if (!digits) errors.phone = "Enter your phone number.";
  else if (!PHONE_RE.test(digits))
    errors.phone = "Enter a valid phone number, like 0712 345 678.";

  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) errors.password = "Create a password.";
  else if (password.length < 8) errors.password = "Use at least 8 characters.";

  return errors;
}
