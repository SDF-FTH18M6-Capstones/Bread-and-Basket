import { Link } from "react-router-dom";

export default function SellerHome() {
  return (
    <main className="mx-auto max-w[1240px] px-4 py-7">
      <div className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-3xl font-bold">Seller dashboard</h1>
        <p className="my-2 text-muted">
          Placeholder. The real page comes in a later task.
        </p>
        <Link to="/" className="text-forest underline">
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
