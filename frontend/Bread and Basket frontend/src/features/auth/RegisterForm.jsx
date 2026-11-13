import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { homeFor } from "../../lib/roles";
import FormField from "./FormField";
import { validateRegister, cleanPhone } from "./validation";

const EMPTY = {
  full_name: "",
  phone: "",
  email: "",
  password: "",
  business_name: "",
  registration_number: "",
  business_address: "",
};

function RoleChoice({ value, label, selected, onSelect }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] p-3.5 font-semibold focus-within:outline-3 focus-within:outline-offset-1 focus-within:outline-orange ${
        selected ? "border-forest bg-lime-soft" : "border-line bg-white"
      }`}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="accent-forest"
      />
      {label}
    </label>
  );
}

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("consumer"); // "consumer" or "seller", the API's role names
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isSeller = role === "seller";

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError("");
  }

  function handleRoleChange(newRole) {
    setRole(newRole);
    setErrors({});
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateRegister(values, role);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const details = {
      full_name: values.full_name.trim(),
      phone: cleanPhone(values.phone),
      email: values.email.trim(),
      password: values.password,
    };
    if (isSeller) {
      details.business_name = values.business_name.trim();
      details.registration_number = values.registration_number.trim();
      details.business_address = values.business_address.trim();
    }

    setSubmitting(true);
    setFormError("");
    try {
      const user = await register(role, details);
      navigate(homeFor(user.role));
    } catch (err) {
      const fieldErrors = { ...(err.fieldErrors || {}) };
      if (err.status === 409) {
        fieldErrors.email = "This email is already registered.";
      } else {
        setFormError(err.message);
      }
      setErrors(fieldErrors);
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-3.5" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div
          className="rounded-lg bg-bad-soft px-3 py-2.5 text-sm text-bad"
          role="alert"
        >
          {formError}
        </div>
      )}

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 font-semibold">Register as</legend>
        <div className="grid grid-cols-2 gap-3">
          <RoleChoice
            value="consumer"
            label="Consumer"
            selected={!isSeller}
            onSelect={handleRoleChange}
          />
          <RoleChoice
            value="seller"
            label="Wholesaler"
            selected={isSeller}
            onSelect={handleRoleChange}
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField
          id="reg-name"
          name="full_name"
          label="Full name"
          autoComplete="name"
          value={values.full_name}
          onChange={handleChange}
          error={errors.full_name}
        />
        <FormField
          id="reg-phone"
          name="phone"
          type="tel"
          label="Phone"
          placeholder="07XX XXX XXX"
          autoComplete="tel"
          value={values.phone}
          onChange={handleChange}
          error={errors.phone}
        />
      </div>
      <FormField
        id="reg-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />
      <FormField
        id="reg-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
      />

      {isSeller && (
        <div className="grid gap-3.5 rounded-2xl bg-canvas p-3.5">
          <strong className="text-sm">Business details for verification</strong>
          <FormField
            id="reg-business"
            name="business_name"
            label="Business name"
            value={values.business_name}
            onChange={handleChange}
            error={errors.business_name}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              id="reg-regno"
              name="registration_number"
              label="Registration no."
              value={values.registration_number}
              onChange={handleChange}
              error={errors.registration_number}
            />
            <FormField
              id="reg-address"
              name="business_address"
              label="Business address"
              value={values.business_address}
              onChange={handleChange}
              error={errors.business_address}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer rounded-full bg-lime px-5 py-4 text-base font-bold text-forest disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-muted">
        Admin accounts are created by the platform.
      </p>
    </form>
  );
}
