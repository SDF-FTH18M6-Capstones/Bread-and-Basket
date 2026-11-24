import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthModal({ tab, onTab, onClose }) {
  const isRegister = tab === "register";
  const tabClass = (active) =>
    `cursor-pointer rounded-full p-3 font-semibold ${
      active ? "bg-forest text-white" : "text-muted"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-forest-deep/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the dark area only
      }}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-3xl bg-white p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="auth-title" className="text-2xl font-bold">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-11 cursor-pointer rounded-full border border-line bg-white text-2xl"
          >
            ×
          </button>
        </div>

        <div
          className="mb-4 grid grid-cols-2 rounded-full bg-canvas p-1"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={tabClass(!isRegister)}
            onClick={() => onTab("login")}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={tabClass(isRegister)}
            onClick={() => onTab("register")}
          >
            Register
          </button>
        </div>

        {isRegister ? <RegisterForm /> : <LoginForm />}
      </div>
    </div>
  );
}
