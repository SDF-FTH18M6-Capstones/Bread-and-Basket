import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { homeFor } from "../../lib/roles";
import FormField from "./FormField";
import { validateLogin } from "./validation";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
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
    const found = validateLogin(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setFormError("");
    try {
      const user = await login({
        email: values.email.trim(),
        password: values.password,
      });
      navigate(homeFor(user.role));
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fieldErrors || {});
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

      <FormField
        id="login-email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        value={values.email}
        onChange={handleChange}
        error={errors.email}
      />
      <FormField
        id="login-password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        value={values.password}
        onChange={handleChange}
        error={errors.password}
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full cursor-pointer rounded-full bg-lime px-5 py-4 text-base font-bold text-forest disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Logging in..." : "Log in"}
      </button>
    </form>
  );
}
