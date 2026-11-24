// Removes spaces and dashes, so "0712 345-678" becomes "0712345678".
export const cleanPhone = (phone) =>
  phone.split(" ").join("").split("-").join("");

// Rough shape check: text, one "@", then a domain with a dot inside it, and no spaces.
function isValidEmail(email) {
  if (email.includes(" ")) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false; // must have exactly one "@"

  const [name, domain] = parts;
  if (name === "") return false;

  // needs a dot that has at least one character before it and one after it
  return domain.slice(1, -1).includes(".");
}

// Optional "+" at the start, then 9 to 15 digits and nothing else (same rule as the API contract).
function isValidPhone(phone) {
  const digits = phone.startsWith("+") ? phone.slice(1) : phone;
  if (digits.length < 9 || digits.length > 15) return false;

  return [...digits].every((character) => character >= "0" && character <= "9");
}

function checkEmail(email) {
  const value = email.trim();
  if (!value) return "Enter your email.";
  if (!isValidEmail(value))
    return "Enter a valid email, like name@example.com.";
  if (value.length > 120) return "Email is too long (120 characters at most).";
  return null;
}

// Required text field with a maximum length from the API contract.
function checkRequired(value, emptyMessage, max) {
  const text = value.trim();
  if (!text) return emptyMessage;
  if (text.length > max) return `Use ${max} characters or fewer.`;
  return null;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = "Enter your password.";
  return errors;
}

// role is "consumer" or "seller". Sellers also need the three business fields.
export function validateRegister(values, role) {
  const errors = {};

  const name = values.full_name.trim();
  if (!name) errors.full_name = "Enter your full name.";
  else if (name.length < 2) errors.full_name = "Your name is too short.";
  else if (name.length > 120)
    errors.full_name = "Your name is too long (120 characters at most).";

  const digits = cleanPhone(values.phone);
  if (!digits) errors.phone = "Enter your phone number.";
  else if (!isValidPhone(digits))
    errors.phone = "Enter a valid phone number, like 0712 345 678.";

  const emailError = checkEmail(values.email);
  if (emailError) errors.email = emailError;

  if (!values.password) errors.password = "Create a password.";
  else if (values.password.length < 8)
    errors.password = "Use at least 8 characters.";

  if (role === "seller") {
    const business = checkRequired(
      values.business_name,
      "Enter your business name.",
      150,
    );
    if (business) errors.business_name = business;

    const registration = checkRequired(
      values.registration_number,
      "Enter your registration number.",
      60,
    );
    if (registration) errors.registration_number = registration;

    const address = checkRequired(
      values.business_address,
      "Enter your business address.",
      255,
    );
    if (address) errors.business_address = address;
  }

  return errors;
}
