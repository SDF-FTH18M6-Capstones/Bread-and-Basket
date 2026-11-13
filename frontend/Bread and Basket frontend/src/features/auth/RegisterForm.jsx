import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { homeFor } from "../../lib/roles";
import FormField from "./FormField";
import { validateRegister, cleanPhone } from "./validation";

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError("");
    try {
      const user = await register({
        full_name: values.full_name.trim(),
        phone: cleanPhone(values.phone),
        email: values.email.trim(),
        password: values.password,
      });
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer rounded-full bg-lime px-5 py-4 text-base font-bold text-forest disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
