import { useState } from "react";
import AuthModal from "../auth/AuthModal";

export default function LandingPage() {
  const [tab, setTab] = useState(null); // null = pop-up closed, otherwise "login" or "register"

  return (
    <>
      <header className="bg-forest py-3.5 text-white">
        <div className="mx-auto flex max-w[1240px] items-center justify-between px-4">
          <span className="text-lg font-extrabold">Bread &amp; Basket</span>
          <nav className="flex gap-3">
            <button
              onClick={() => setTab("login")}
              className="cursor-pointer rounded-full border-[1.5px] border-lime bg-transparent px-5 py-2.5 font-bold text-lime"
            >
              Log in
            </button>
            <button
              onClick={() => setTab("register")}
              className="cursor-pointer rounded-full bg-lime px-5 py-2.5 font-bold text-forest"
            >
              Register
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w[1240px] px-4 py-7">
        <div className="rounded-2xl border border-line bg-white p-6">
          <h1 className="text-3xl font-bold">Buy wholesale together</h1>
          <p className="mt-2 text-muted">
            Join a group purchase and get wholesale prices on food and household
            essentials.
          </p>
        </div>
      </main>

      {tab && (
        <AuthModal tab={tab} onTab={setTab} onClose={() => setTab(null)} />
      )}
    </>
  );
}
