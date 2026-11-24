import { useEffect, useState } from "react";
import {
  getPendingSellers,
  getPendingProducts,
  approveSeller,
  rejectSeller,
  approveProduct,
  rejectProduct,
} from "../../api/adminApprovals";
import { assetUrl } from "../../api/client";

function formatKES(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

function getSavingsPercentage(wholesale, retail) {
  const wholesalePrice = Number(wholesale);
  const retailPrice = Number(retail);

  if (!retailPrice || retailPrice <= 0) {
    return 0;
  }

  return Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100);
}

function SellerAvatar({ name }) {
  const initials = (name || "Seller")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-lime text-lg font-extrabold text-forest">
      {initials}
    </div>
  );
}

function ProductImage({ src, name }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = src ? assetUrl(src) : null;

  if (!image || imageFailed) {
    return (
      <div className="flex h-[150px] w-full items-center justify-center bg-grey-soft text-sm text-muted">
        No product image
      </div>
    );
  }

  return (
    <div className="h-[150px] w-full overflow-hidden bg-grey-soft">
      <img
        src={image}
        alt={name}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}

function ActionButtons({ onApprove, onReject, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onReject}
        disabled={disabled}
        className="min-h-10 rounded-full bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reject
      </button>

      <button
        type="button"
        onClick={onApprove}
        disabled={disabled}
        className="min-h-10 rounded-full bg-lime px-5 text-sm font-bold text-forest transition hover:bg-lime/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Approve
      </button>
    </div>
  );
}

function RejectionModal({
  item,
  reason,
  setReason,
  onClose,
  onConfirm,
  submitting,
  error,
}) {
  const validReason = reason.trim().length >= 3;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#0D2B1B]/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejection-title"
        className="w-full max-w-[440px] rounded-[24px] bg-white p-6 shadow-2xl"
      >
        <h2 id="rejection-title" className="text-2xl font-bold text-forest">
          Reject {item.type}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          Please provide a reason for rejecting this {item.type}. This reason
          will be recorded.
        </p>

        <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-ink">
          Rejection reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Enter the reason for rejection..."
            disabled={submitting}
            className="w-full resize-y rounded-xl border border-line bg-white p-3 text-sm font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-lime/40"
          />
        </label>

        <p className="mt-1 text-xs text-muted">
          At least 3 characters required.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:bg-grey-soft disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!validReason || submitting}
            className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Rejecting..." : "Confirm rejection"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AdminHome() {
  const [activeTab, setActiveTab] = useState("sellers");

  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [processingId, setProcessingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [rejectionItem, setRejectionItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectionError, setRejectionError] = useState("");

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    setLoading(true);
    setLoadError("");

    try {
      const [sellerData, productData] = await Promise.all([
        getPendingSellers(),
        getPendingProducts(),
      ]);

      setSellers(Array.isArray(sellerData) ? sellerData : []);
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (error) {
      setLoadError(error.message || "Unable to load pending approvals.");
    } finally {
      setLoading(false);
    }
  }

  function openRejectionModal(type, item) {
    setRejectionItem({ type, item });
    setRejectionReason("");
    setRejectionError("");
    setActionError("");
    setSuccessMessage("");
  }

  function closeRejectionModal() {
    if (rejecting) {
      return;
    }

    setRejectionItem(null);
    setRejectionReason("");
    setRejectionError("");
  }

  async function handleApprove(type, item) {
    setProcessingId(`${type}-${item.id}`);
    setActionError("");
    setSuccessMessage("");

    try {
      if (type === "seller") {
        await approveSeller(item.id);

        setSellers((previous) =>
          previous.filter((seller) => seller.id !== item.id),
        );

        setSuccessMessage(`${item.business_name} has been approved.`);
      } else {
        await approveProduct(item.id);

        setProducts((previous) =>
          previous.filter((product) => product.id !== item.id),
        );

        setSuccessMessage(`${item.name} has been approved.`);
      }
    } catch (error) {
      if (error.code === "SELLER_NOT_APPROVED") {
        setActionError(
          "This seller must be approved before their products can be approved.",
        );
      } else {
        setActionError(error.message || `Unable to approve this ${type}.`);
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject() {
    if (!rejectionItem || rejectionReason.trim().length < 3) {
      setRejectionError("Please provide a reason of at least 3 characters.");
      return;
    }

    const { type, item } = rejectionItem;

    setRejecting(true);
    setRejectionError("");

    try {
      if (type === "seller") {
        await rejectSeller(item.id, rejectionReason.trim());

        setSellers((previous) =>
          previous.filter((seller) => seller.id !== item.id),
        );

        setSuccessMessage(`${item.business_name} has been rejected.`);
      } else {
        await rejectProduct(item.id, rejectionReason.trim());

        setProducts((previous) =>
          previous.filter((product) => product.id !== item.id),
        );

        setSuccessMessage(`${item.name} has been rejected.`);
      }

      setRejectionItem(null);
      setRejectionReason("");
    } catch (error) {
      setRejectionError(error.message || `Unable to reject this ${type}.`);
    } finally {
      setRejecting(false);
    }
  }

  const pendingCount =
    activeTab === "sellers" ? sellers.length : products.length;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-forest sm:text-4xl">
            Approvals
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-muted">
            Review and manage pending wholesaler registrations and products.
          </p>
        </div>

        <div className="flex w-full rounded-xl border border-line bg-white p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("sellers");
              setActionError("");
            }}
            className={`flex-1 rounded-lg px-5 py-3 text-sm font-bold transition sm:flex-none ${
              activeTab === "sellers"
                ? "bg-lime text-forest"
                : "text-muted hover:bg-grey-soft"
            }`}
          >
            Sellers ({sellers.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("products");
              setActionError("");
            }}
            className={`flex-1 rounded-lg px-5 py-3 text-sm font-bold transition sm:flex-none ${
              activeTab === "products"
                ? "bg-lime text-forest"
                : "text-muted hover:bg-grey-soft"
            }`}
          >
            Products ({products.length})
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {loadError && (
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center">
          <p>{loadError}</p>

          <button
            type="button"
            onClick={loadApprovals}
            className="font-bold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-line bg-white py-20 text-center text-sm text-muted">
          Loading pending approvals...
        </div>
      ) : !loadError ? (
        activeTab === "sellers" ? (
          sellers.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white px-5 py-20 text-center">
              <h2 className="text-xl font-bold text-forest">
                No pending sellers
              </h2>

              <p className="mt-2 text-sm text-muted">
                No wholesalers waiting for verification.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sellers.map((seller) => (
                <article
                  key={seller.id}
                  className="flex flex-col gap-4 rounded-[18px] border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
                >
                  <SellerAvatar name={seller.business_name} />

                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-[17px] font-bold text-forest">
                      {seller.business_name}
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      Reg {seller.registration_number || "Not provided"}
                    </p>

                    <p className="mt-1 break-words text-sm text-muted">
                      {seller.business_address || "Address not provided"}
                    </p>

                    <p className="mt-1 break-words text-sm text-muted">
                      {seller.user?.full_name || "Owner not provided"}
                      {" · "}
                      {seller.user?.phone || "Phone not provided"}
                    </p>

                    {seller.user?.email && (
                      <p className="mt-1 break-all text-xs text-muted">
                        {seller.user.email}
                      </p>
                    )}
                  </div>

                  <ActionButtons
                    disabled={processingId === `seller-${seller.id}`}
                    onApprove={() => handleApprove("seller", seller)}
                    onReject={() => openRejectionModal("seller", seller)}
                  />
                </article>
              ))}
            </div>
          )
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white px-5 py-20 text-center">
            <h2 className="text-xl font-bold text-forest">
              No pending products
            </h2>

            <p className="mt-2 text-sm text-muted">
              No products waiting for approval.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[18px]">
            {products.map((product) => {
              const sellerNotApproved =
                product.seller &&
                product.seller.verification_status !== "approved";

              return (
                <article
                  key={product.id}
                  className="flex min-w-0 flex-col gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <ProductImage src={product.image_url} name={product.name} />

                  <div>
                    <h2 className="break-words text-[17px] font-bold text-forest">
                      {product.name}
                      <span className="ml-1 text-xs font-normal text-muted">
                        {product.unit}
                      </span>
                    </h2>

                    <p className="mt-1 text-xs text-muted">
                      by {product.seller?.business_name || "Bread & Basket"}
                    </p>
                  </div>

                  <div className="text-sm">
                    <p>
                      Wholesale{" "}
                      <strong>{formatKES(product.wholesale_price)}</strong>
                      {" · "}
                      Retail {formatKES(product.retail_price)}
                    </p>

                    <p className="mt-1">
                      <span className="font-semibold text-green-700">
                        {getSavingsPercentage(
                          product.wholesale_price,
                          product.retail_price,
                        )}
                        % savings
                      </span>
                    </p>

                    <p className="mt-1 text-muted">
                      Stock {product.stock_quantity ?? 0}
                    </p>
                  </div>

                  {sellerNotApproved && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                      Seller not verified yet. Approve the seller first.
                    </div>
                  )}

                  <div className="mt-auto border-t border-line pt-3">
                    <ActionButtons
                      disabled={
                        processingId === `product-${product.id}` ||
                        Boolean(sellerNotApproved)
                      }
                      onApprove={() => handleApprove("product", product)}
                      onReject={() => openRejectionModal("product", product)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : null}

      {rejectionItem && (
        <RejectionModal
          item={rejectionItem}
          reason={rejectionReason}
          setReason={setRejectionReason}
          onClose={closeRejectionModal}
          onConfirm={handleReject}
          submitting={rejecting}
          error={rejectionError}
        />
      )}
    </main>
  );
}
