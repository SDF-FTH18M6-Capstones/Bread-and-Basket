import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  getSellerProducts,
  submitSellerProduct,
  updateSellerProduct,
} from "../../api/sellerProducts";
import { assetUrl } from "../../api/client";
import { productImage } from "../../lib/productImages";

const CATEGORIES = [
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits", label: "Fruits" },
  { value: "rice_grains", label: "Rice & Grains" },
  { value: "flour", label: "Flour" },
  { value: "cooking_oil", label: "Cooking Oil" },
  { value: "sugar", label: "Sugar" },
  { value: "pulses", label: "Pulses" },
  { value: "dairy_eggs", label: "Dairy & Eggs" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  unit: "",
  wholesale_price: "",
  retail_price: "",
  stock_quantity: "",
  image_url: "",
};

// Turn a product from the API into form values (inputs always hold strings)
function toForm(product) {
  if (!product) return EMPTY_FORM;
  return {
    name: product.name ?? "",
    description: product.description ?? "",
    category: product.category ?? "",
    unit: product.unit ?? "",
    wholesale_price: String(product.wholesale_price ?? ""),
    retail_price: String(product.retail_price ?? ""),
    stock_quantity: String(product.stock_quantity ?? ""),
    image_url: product.image_url ?? "",
  };
}

// Only approved products are locked; pending and rejected can be edited
const EDITABLE = ["pending", "rejected"];

function formatKES(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

function ApprovalBadge({ status }) {
  const styles = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
  };

  const labels = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {labels[status] || status || "Unknown"}
    </span>
  );
}

// Card image: the seller's link, or the category picture if there's no link
// or the link is broken.
function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  const fallback = productImage({ category: product.category });
  const src =
    !failed && product.image_url ? assetUrl(product.image_url) : fallback;

  return (
    <div className="h-[150px] w-full overflow-hidden rounded-xl bg-canvas">
      <img
        src={src}
        alt={product.name}
        className="h-full w-full object-contain p-2"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// Small live preview next to the "Image link" field
function ImageLinkPreview({ url }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className="flex h-full items-center justify-center px-2 text-center text-[11px] leading-tight text-bad">
        Can't load this link
      </p>
    );
  }

  return (
    <img
      src={assetUrl(url)}
      alt="Product preview"
      onError={() => setFailed(true)}
      className="size-full object-contain p-1"
    />
  );
}

function ProductCard({ product, onEdit }) {
  const editable = EDITABLE.includes(product.approval_status);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="relative">
        <ProductImage product={product} />

        <div className="absolute left-2 top-2">
          <ApprovalBadge status={product.approval_status} />
        </div>
      </div>

      <div>
        <h2 className="break-words text-[17px] font-bold text-forest">
          {product.name}
        </h2>

        <p className="mt-1 text-xs text-muted">{product.unit}</p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-xl font-extrabold text-forest">
          {formatKES(product.wholesale_price)}
        </span>

        <span className="text-xs text-muted line-through">
          {formatKES(product.retail_price)}
        </span>
      </div>

      {product.approval_status === "rejected" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Rejection reason</strong>

          <p className="mt-1 leading-relaxed">
            {product.rejection_reason ||
              "Your product was not approved. Please review its details."}
          </p>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <span className="text-muted">
          Stock{" "}
          <strong className="ml-1 text-ink">
            {product.stock_quantity ?? 0}
          </strong>
        </span>

        {editable && (
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-forest transition hover:border-forest hover:bg-lime-soft"
          >
            {product.approval_status === "rejected"
              ? "Edit & resubmit"
              : "Edit"}
          </button>
        )}
      </div>
    </article>
  );
}

// One form for both: `product` empty = add, `product` given = edit
function ProductFormModal({ product, onClose, onSubmit, submitting, error }) {
  const isEdit = Boolean(product);
  const initial = toForm(product);

  const [form, setForm] = useState(initial);
  const [formError, setFormError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const wholesale = Number(form.wholesale_price);
    const retail = Number(form.retail_price);
    const stock = Number(form.stock_quantity);

    if (wholesale <= 0 || retail <= 0) {
      setFormError("Enter valid prices greater than zero.");
      return;
    }

    if (wholesale >= retail) {
      setFormError("The wholesale price must be lower than the retail price.");
      return;
    }

    if (stock < 0 || !Number.isInteger(stock)) {
      setFormError("Enter a valid stock quantity.");
      return;
    }

    const values = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      unit: form.unit.trim(),
      wholesale_price: wholesale,
      retail_price: retail,
      stock_quantity: stock,
      image_url: form.image_url.trim() || null,
    };

    if (!isEdit) {
      await onSubmit(values);
      return;
    }

    // Edit: send only the fields that changed (PATCH = partial update)
    const before = {
      ...toForm(product),
      wholesale_price: Number(product.wholesale_price),
      retail_price: Number(product.retail_price),
      stock_quantity: Number(product.stock_quantity),
      image_url: product.image_url || null,
    };
    const changes = Object.fromEntries(
      Object.entries(values).filter(([key, value]) => value !== before[key]),
    );

    if (Object.keys(changes).length === 0) {
      setFormError("Nothing has changed yet.");
      return;
    }

    await onSubmit(changes);
  }

  const inputClass =
    "min-h-[46px] w-full rounded-xl border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-lime/40";

  const labelClass =
    "flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-ink";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-[#0D2B1B]/55 p-4 max-[640px]:items-end max-[640px]:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-product-title"
        className="my-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[28px] bg-white p-[26px] shadow-2xl max-[640px]:my-0 max-[640px]:max-h-[92vh] max-[640px]:rounded-t-[26px] max-[640px]:rounded-b-none max-[640px]:px-[18px] max-[640px]:pb-8 max-[640px]:pt-5"
      >
        {/* Mobile modal handle */}
        <div className="mx-auto mb-4 hidden h-[5px] w-11 rounded-full bg-line max-[640px]:block" />

        {/* Modal heading */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="add-product-title"
            className="text-[22px] font-bold text-forest"
          >
            {isEdit ? "Edit product" : "Add product"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-line bg-white text-forest transition hover:bg-grey-soft disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
          {isEdit &&
            product.approval_status === "rejected" &&
            product.rejection_reason && (
              <div className="rounded-xl bg-orange-soft p-3 text-sm leading-snug text-orange-text">
                <strong>Admin's note:</strong> {product.rejection_reason}
              </div>
            )}

          {isEdit && (
            <p className="text-xs leading-relaxed text-muted">
              Saving sends the product back to the admin for review.
            </p>
          )}

          {/* Product image (by link) */}
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
            <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white text-muted">
              {form.image_url.trim() ? (
                <ImageLinkPreview
                  key={form.image_url.trim()}
                  url={form.image_url.trim()}
                />
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </div>

            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold text-ink">
              <span>
                Image link{" "}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input
                type="text"
                name="image_url"
                value={form.image_url}
                onChange={handleChange}
                placeholder="https://…/product.jpg"
                maxLength={500}
                disabled={submitting}
                className="min-h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition placeholder:text-muted/70 focus:border-forest focus:ring-2 focus:ring-lime/40"
              />
              <span className="text-xs font-normal text-muted">
                Leave empty to use the category picture.
              </span>
            </label>
          </div>

          {/* Product name */}
          <label className={labelClass}>
            Name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Pishori rice"
              required
              minLength={2}
              maxLength={150}
              className={inputClass}
            />
          </label>

          {/* Description */}
          <label className={labelClass}>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your product..."
              rows={2}
              maxLength={2000}
              className={`${inputClass} min-h-[70px] resize-y py-2.5`}
            />
          </label>

          {/* Category */}
          <label className={labelClass}>
            Category
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Select a category</option>

              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          {/* Unit and stock */}
          <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
            <label className={labelClass}>
              Unit
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="1kg, 2L bottle"
                required
                maxLength={40}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Stock
              <input
                type="number"
                name="stock_quantity"
                value={form.stock_quantity}
                onChange={handleChange}
                placeholder="e.g. 100"
                min="0"
                step="1"
                required
                className={inputClass}
              />
            </label>
          </div>

          {/* Wholesale and retail prices */}
          <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
            <label className={labelClass}>
              Wholesale (KES)
              <input
                type="number"
                name="wholesale_price"
                value={form.wholesale_price}
                onChange={handleChange}
                placeholder="e.g. 450"
                min="1"
                step="1"
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Retail (KES)
              <input
                type="number"
                name="retail_price"
                value={form.retail_price}
                onChange={handleChange}
                placeholder="e.g. 600"
                min="1"
                step="1"
                required
                className={inputClass}
              />
            </label>
          </div>

          {/* Validation and API errors */}
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[54px] self-start rounded-full bg-lime px-[22px] text-[17px] font-bold text-forest transition hover:bg-lime/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : isEdit
                ? "Save and resubmit"
                : "Submit for approval"}
          </button>
        </form>
      </section>
    </div>
  );
}

function VerificationMessage({ status, rejectionReason }) {
  if (status === "pending") {
    return (
      <section className="mx-auto flex min-h-[65vh] w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-12 text-center shadow-sm">
        <p className="mb-3 text-xs font-bold tracking-widest text-muted">
          WHOLESALER VERIFICATION
        </p>

        <h1 className="text-3xl font-extrabold text-forest">
          Waiting for approval
        </h1>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Your wholesaler account has been submitted and is waiting for admin
          verification.
        </p>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Once your account is approved, you will be able to add products and
          submit them for review.
        </p>

        <span className="mt-6 inline-flex rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800">
          Account status: Pending
        </span>
      </section>
    );
  }

  if (status === "rejected") {
    return (
      <section className="mx-auto flex min-h-[65vh] w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-12 text-center shadow-sm">
        <p className="mb-3 text-xs font-bold tracking-widest text-muted">
          WHOLESALER VERIFICATION
        </p>

        <h1 className="text-3xl font-extrabold text-forest">
          Account not approved
        </h1>

        <p className="mt-4 text-sm text-muted">
          Your wholesaler account was not approved.
        </p>

        {rejectionReason && (
          <div className="mt-6 w-full rounded-xl bg-red-50 p-4 text-left text-sm text-red-800">
            <strong>Reason</strong>
            <p className="mt-2 leading-relaxed">{rejectionReason}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-8 text-center">
      <h1 className="text-xl font-bold text-forest">
        Verification status unavailable
      </h1>

      <p className="mt-3 text-sm text-muted">
        We could not retrieve your wholesaler verification status. Please sign
        in again or contact support.
      </p>
    </section>
  );
}

export default function SellerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = adding
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const sellerStatus = user?.seller?.verification_status;
  const sellerRejectionReason = user?.seller?.rejection_reason;

  useEffect(() => {
    if (sellerStatus !== "approved") {
      setLoading(false);
      return;
    }

    loadProducts();
  }, [sellerStatus]);

  async function loadProducts() {
    setLoading(true);
    setLoadError("");

    try {
      const data = await getSellerProducts();

      setProducts(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : [],
      );
    } catch (error) {
      setLoadError(error.message || "Unable to load your products.");
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setSubmitError("");
    setEditingProduct(null);
    setShowModal(true);
  }

  function openEdit(product) {
    setSubmitError("");
    setEditingProduct(product);
    setShowModal(true);
  }

  async function handleSubmit(values) {
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");

    try {
      if (editingProduct) {
        await updateSellerProduct(editingProduct.id, values);
      } else {
        await submitSellerProduct(values);
      }
      await loadProducts();

      setShowModal(false);
      setSubmitSuccess(
        editingProduct
          ? `${editingProduct.name} was updated and sent back for review.`
          : "Your product has been submitted for approval.",
      );
      setEditingProduct(null);
    } catch (error) {
      if (error.code === "SELLER_NOT_APPROVED") {
        setSubmitError("Your wholesaler account is waiting for approval.");
      } else if (error.code === "PRODUCT_NOT_EDITABLE") {
        setSubmitError(
          "This product is already approved, so it can't be edited.",
        );
      } else {
        setSubmitError(error.message || "Unable to save your product.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sellerStatus !== "approved") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <VerificationMessage
          status={sellerStatus}
          rejectionReason={sellerRejectionReason}
        />
      </div>
    );
  }

  const approvedCount = products.filter(
    (product) => product.approval_status === "approved",
  ).length;

  const pendingCount = products.filter(
    (product) => product.approval_status === "pending",
  ).length;

  const rejectedCount = products.filter(
    (product) => product.approval_status === "rejected",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold text-forest sm:text-4xl">
              Products
            </h1>

            {!loading && (
              <span className="rounded-full bg-grey-soft px-3 py-1 text-xs font-semibold text-muted">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed text-muted">
            Manage your submitted products and their approval status.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/seller/campaigns")}
            className="rounded-xl border border-line bg-white px-6 py-3.5 text-sm font-bold text-forest transition hover:bg-grey-soft"
          >
            Campaign Orders
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex w-full items-center justify-center rounded-xl bg-lime px-6 py-3.5 text-sm font-bold text-forest transition hover:bg-lime/80 sm:w-auto"
          >
            Add product
          </button>
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {submitSuccess}
        </div>
      )}

      {loadError && (
        <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center">
          <p>{loadError}</p>

          <button
            type="button"
            onClick={loadProducts}
            className="font-bold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-line bg-white py-20 text-center text-sm text-muted">
          Loading your products...
        </div>
      ) : !loadError ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-800">
              {approvedCount} approved
            </span>

            <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
              {pendingCount} pending
            </span>

            <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">
              {rejectedCount} rejected
            </span>
          </div>

          {products.length === 0 ? (
            <section className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-5 py-20 text-center">
              <h2 className="text-xl font-bold text-forest">No products yet</h2>

              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                You haven't submitted any products. Add your first product to
                get started.
              </p>

              <button
                type="button"
                onClick={openAdd}
                className="mt-6 rounded-xl bg-lime px-6 py-3 font-bold text-forest transition hover:bg-lime/80"
              >
                Add your first product
              </button>
            </section>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[18px]">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={openEdit}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {showModal && (
        <ProductFormModal
          key={editingProduct?.id ?? "new"}
          product={editingProduct}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
}
