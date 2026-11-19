import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getAdminCampaigns,
  getApprovedProducts,
  createCampaign,
  updateCampaign,
  activateCampaign,
} from "../../api/adminCampaigns";

function unwrapList(response, keys) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.data)) return response.data;

  return [];
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toApiDate(value) {
  return new Date(value).toISOString();
}

function getDefaultDates() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  deadline.setHours(18, 0, 0, 0);

  const cutoff = new Date(deadline);
  cutoff.setDate(cutoff.getDate() - 3);

  return {
    deadline: toDateTimeLocal(deadline),
    cancellation_cutoff: toDateTimeLocal(cutoff),
  };
}

function formatKES(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
}

export default function AdminCampaignFormPage() {
  const navigate = useNavigate();
  const { campaignId } = useParams();

  const isEditing = Boolean(campaignId);

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  const [form, setForm] = useState(() => ({
    title: "",
    platform_charge: 10,
    min_quantity: 30,
    max_quantity: 60,
    min_order_quantity: 1,
    max_per_user: "",
    ...getDefaultDates(),
  }));

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) => String(product.id) === String(selectedProductId),
      ),
    [products, selectedProductId],
  );

  useEffect(() => {
    async function loadFormData() {
      try {
        setLoading(true);
        setError("");

        const productResponse = await getApprovedProducts();

        const approvedProducts = unwrapList(productResponse, [
          "products",
          "items",
        ]);

        setProducts(approvedProducts);

        if (isEditing) {
          const campaignResponse = await getAdminCampaigns();

          const campaigns = unwrapList(campaignResponse, [
            "campaigns",
            "items",
          ]);

          const existingCampaign = campaigns.find(
            (campaign) => String(campaign.id) === String(campaignId),
          );

          if (!existingCampaign) {
            setError("Campaign not found.");
            return;
          }

          if (existingCampaign.status !== "draft") {
            setError("Only draft campaigns can be edited.");
            return;
          }

          setSelectedProductId(
            String(
              existingCampaign.product_id ?? existingCampaign.product?.id ?? "",
            ),
          );

          setForm({
            title: existingCampaign.title || "",
            platform_charge: existingCampaign.platform_charge ?? 10,
            min_quantity: existingCampaign.min_quantity ?? 1,
            max_quantity: existingCampaign.max_quantity ?? 1,
            min_order_quantity: existingCampaign.min_order_quantity ?? 1,
            max_per_user: existingCampaign.max_per_user ?? "",
            deadline: toDateTimeLocal(existingCampaign.deadline),
            cancellation_cutoff: toDateTimeLocal(
              existingCampaign.cancellation_cutoff,
            ),
          });
        } else if (approvedProducts.length > 0) {
          setSelectedProductId(String(approvedProducts[0].id));
        }
      } catch (err) {
        setError(err.message || "Unable to load the campaign form.");
      } finally {
        setLoading(false);
      }
    }

    loadFormData();
  }, [campaignId, isEditing]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setError("");
    setNotice("");
  }

  function validateForm() {
    const errors = {};

    const minimum = Number(form.min_quantity);
    const maximum = Number(form.max_quantity);
    const minimumOrder = Number(form.min_order_quantity);
    const maximumPerUser =
      form.max_per_user === "" ? null : Number(form.max_per_user);

    if (!selectedProduct) {
      errors.product_id = "Select an approved product.";
    }

    if (!form.title.trim() || form.title.trim().length < 3) {
      errors.title = "Enter a title with at least 3 characters.";
    }

    if (!Number.isInteger(minimum) || minimum < 1) {
      errors.min_quantity = "Minimum quantity must be at least 1.";
    }

    if (!Number.isInteger(maximum) || maximum < 1) {
      errors.max_quantity = "Maximum quantity must be at least 1.";
    }

    if (
      Number.isInteger(minimum) &&
      Number.isInteger(maximum) &&
      minimum > maximum
    ) {
      errors.max_quantity =
        "Maximum quantity cannot be lower than minimum quantity.";
    }

    if (
      selectedProduct &&
      maximum > Number(selectedProduct.stock_quantity || 0)
    ) {
      errors.max_quantity = `Maximum quantity cannot exceed available stock (${selectedProduct.stock_quantity}).`;
    }

    if (!Number.isInteger(minimumOrder) || minimumOrder < 1) {
      errors.min_order_quantity = "Minimum order quantity must be at least 1.";
    } else if (minimumOrder > maximum) {
      errors.min_order_quantity =
        "Minimum order quantity cannot exceed the campaign maximum.";
    }

    if (
      maximumPerUser !== null &&
      (!Number.isInteger(maximumPerUser) ||
        maximumPerUser < minimumOrder ||
        maximumPerUser > maximum)
    ) {
      errors.max_per_user =
        "Maximum per person must be between the minimum order and campaign maximum.";
    }

    if (
      !Number.isInteger(Number(form.platform_charge)) ||
      Number(form.platform_charge) < 0
    ) {
      errors.platform_charge = "Platform charge must be zero or greater.";
    }

    const deadline = new Date(form.deadline);
    const cutoff = new Date(form.cancellation_cutoff);

    if (!form.deadline || Number.isNaN(deadline.getTime())) {
      errors.deadline = "Choose a valid campaign deadline.";
    } else if (deadline <= new Date()) {
      errors.deadline = "The campaign deadline must be in the future.";
    }

    if (!form.cancellation_cutoff || Number.isNaN(cutoff.getTime())) {
      errors.cancellation_cutoff = "Choose a valid cancellation cutoff.";
    } else if (!Number.isNaN(deadline.getTime()) && cutoff > deadline) {
      errors.cancellation_cutoff =
        "Cancellation cutoff must be on or before the deadline.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function buildPayload() {
    const payload = {
      title: form.title.trim(),
      min_quantity: Number(form.min_quantity),
      max_quantity: Number(form.max_quantity),
      min_order_quantity: Number(form.min_order_quantity),
      platform_charge: Number(form.platform_charge),
      deadline: toApiDate(form.deadline),
      cancellation_cutoff: toApiDate(form.cancellation_cutoff),
      max_per_user: form.max_per_user === "" ? null : Number(form.max_per_user),
    };

    if (!isEditing) {
      payload.product_id = Number(selectedProductId);
    }

    return payload;
  }

  async function handleSubmit(event, publish = false) {
    event.preventDefault();

    setError("");
    setNotice("");
    setFieldErrors({});

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = buildPayload();

      if (isEditing) {
        await updateCampaign(campaignId, payload);

        if (publish) {
          try {
            await activateCampaign(campaignId);
          } catch (activationError) {
            setNotice(
              `Draft changes were saved, but activation failed: ${activationError.message}`,
            );
            return;
          }
        }
      } else {
        const created = await createCampaign(payload);

        const newCampaign = created?.campaign || created?.data || created;

        const newCampaignId = newCampaign?.id;

        if (!newCampaignId) {
          setNotice(
            "The draft was submitted, but the API did not return its campaign ID. Check the campaign list before trying again.",
          );
          return;
        }

        if (publish) {
          try {
            await activateCampaign(newCampaignId);
          } catch (activationError) {
            setNotice(
              `The draft was saved successfully, but activation failed: ${activationError.message}`,
            );
            navigate(`/admin/campaigns/${newCampaignId}`);
            return;
          }
        }

        navigate(`/admin/campaigns/${newCampaignId}`);
        return;
      }

      navigate(
        isEditing ? `/admin/campaigns/${campaignId}` : "/admin/campaigns",
      );
    } catch (err) {
      setError(err.message || "Unable to save the campaign.");

      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-main">
        <div className="rounded-2xl border border-line bg-white p-12 text-center">
          <p className="text-sm text-muted">Loading campaign form...</p>
        </div>
      </main>
    );
  }

  if (error && isEditing && !selectedProductId) {
    return (
      <main className="admin-main">
        <button
          type="button"
          onClick={() => navigate("/admin/campaigns")}
          className="mb-6 text-sm font-semibold text-forest hover:underline"
        >
          ← Back to campaigns
        </button>

        <div className="rounded-2xl border border-line bg-white p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  const wholesalePrice = Number(selectedProduct?.wholesale_price || 0);

  const retailPrice = Number(selectedProduct?.retail_price || 0);

  const savings =
    retailPrice > 0
      ? Math.round(((retailPrice - wholesalePrice) / retailPrice) * 100)
      : 0;

  return (
    <main className="admin-main min-w-0">
      <button
        type="button"
        onClick={() =>
          navigate(
            isEditing ? `/admin/campaigns/${campaignId}` : "/admin/campaigns",
          )
        }
        className="mb-6 text-sm font-semibold text-forest hover:underline"
      >
        ← Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest sm:text-3xl">
          {isEditing ? "Edit campaign draft" : "Create campaign"}
        </h1>

        <p className="mt-2 text-sm text-muted">
          {isEditing
            ? "Update the details of this draft campaign."
            : "Create a group-buying campaign using an approved product."}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {notice}
        </div>
      )}

      {products.length === 0 && !isEditing ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center">
          <h2 className="font-semibold text-forest">
            No approved products available
          </h2>

          <p className="mt-2 text-sm text-muted">
            Approve a product before creating a campaign.
          </p>

          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mt-5 rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white"
          >
            Go to approvals
          </button>
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <form
            onSubmit={(event) => handleSubmit(event, true)}
            className="space-y-6 rounded-2xl border border-line bg-white p-5 sm:p-7"
          >
            <div>
              <h2 className="font-bold text-forest">Campaign details</h2>

              <p className="mt-1 text-sm text-muted">
                Complete the campaign information below.
              </p>
            </div>

            {!isEditing && (
              <div>
                <label
                  htmlFor="product_id"
                  className="mb-2 block text-sm font-semibold text-forest"
                >
                  Approved product
                </label>

                <select
                  id="product_id"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-forest outline-none focus:border-forest"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.unit}) — Stock:{" "}
                      {product.stock_quantity}
                    </option>
                  ))}
                </select>

                {fieldErrors.product_id && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.product_id}
                  </p>
                )}
              </div>
            )}

            {isEditing && selectedProduct && (
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Selected product
                </p>

                <p className="mt-1 font-semibold text-forest">
                  {selectedProduct.name} ({selectedProduct.unit})
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-forest"
              >
                Campaign title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={updateField}
                placeholder="e.g. Rice December Drive"
                className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-forest"
              />

              {fieldErrors.title && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-forest">
                  Campaign price per unit
                </label>

                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-forest">
                  {selectedProduct
                    ? formatKES(wholesalePrice)
                    : "Select a product"}
                </div>

                <p className="mt-1 text-xs text-muted">
                  Copied from the product's wholesale price.
                </p>
              </div>

              <div>
                <label
                  htmlFor="platform_charge"
                  className="mb-2 block text-sm font-semibold text-forest"
                >
                  Platform fee per unit (KSh)
                </label>

                <input
                  id="platform_charge"
                  name="platform_charge"
                  type="number"
                  min="0"
                  step="1"
                  value={form.platform_charge}
                  onChange={updateField}
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-forest"
                />

                {fieldErrors.platform_charge && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.platform_charge}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="min_quantity"
                  className="mb-2 block text-sm font-semibold text-forest"
                >
                  Minimum quantity
                </label>

                <input
                  id="min_quantity"
                  name="min_quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.min_quantity}
                  onChange={updateField}
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-forest"
                />

                {fieldErrors.min_quantity && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.min_quantity}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="max_quantity"
                  className="mb-2 block text-sm font-semibold text-forest"
                >
                  Maximum quantity
                </label>

                <input
                  id="max_quantity"
                  name="max_quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_quantity}
                  onChange={updateField}
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-forest"
                />

                <p className="mt-1 text-xs text-muted">
                  Available stock: {selectedProduct?.stock_quantity ?? "—"}
                </p>

                {fieldErrors.max_quantity && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.max_quantity}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="min_order_quantity"
                  className="mb-2 block text-sm font-semibold text-forest"
                >
                  Minimum per order
                </label>

                <input
                  id="min_order_quantity"
                  name="min_order_quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.min_order_quantity}
                  onChange={updateField}
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-forest"
                />

                {fieldErrors.min_order_quantity && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.min_order_quantity}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="max_per_user"
                  className="mb-2 block text-sm font-semibold text-forest"
                >
                  Maximum per person (optional)
                </label>

                <input
                  id="max_per_user"
                  name="max_per_user"
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_per_user}
                  onChange={updateField}
                  placeholder="No limit"
                  className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none focus:border-forest"
                />

                {fieldErrors.max_per_user && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.max_per_user}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-line pt-5">
              <h3 className="mb-4 font-semibold text-forest">Campaign dates</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="deadline"
                    className="mb-2 block text-sm font-semibold text-forest"
                  >
                    Deadline
                  </label>

                  <input
                    id="deadline"
                    name="deadline"
                    type="datetime-local"
                    value={form.deadline}
                    onChange={updateField}
                    className="w-full rounded-xl border border-line px-3 py-3 text-sm outline-none focus:border-forest"
                  />

                  {fieldErrors.deadline && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.deadline}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="cancellation_cutoff"
                    className="mb-2 block text-sm font-semibold text-forest"
                  >
                    Cancellation cutoff
                  </label>

                  <input
                    id="cancellation_cutoff"
                    name="cancellation_cutoff"
                    type="datetime-local"
                    value={form.cancellation_cutoff}
                    onChange={updateField}
                    className="w-full rounded-xl border border-line px-3 py-3 text-sm outline-none focus:border-forest"
                  />

                  <p className="mt-1 text-xs text-muted">
                    Defaults to 3 days before the deadline.
                  </p>

                  {fieldErrors.cancellation_cutoff && (
                    <p className="mt-1 text-xs text-red-600">
                      {fieldErrors.cancellation_cutoff}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 text-sm text-muted">
              Saving creates or updates a draft. Publishing saves the draft
              first, then activates it.
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={(event) => handleSubmit(event, false)}
                disabled={submitting}
                className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-forest transition hover:bg-gray-50 disabled:opacity-50"
              >
                Save draft
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : isEditing
                    ? "Save and publish"
                    : "Publish campaign"}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl bg-forest p-5 text-white sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-lime">
              Shopper card preview
            </p>

            {selectedProduct ? (
              <>
                <div className="mt-5 overflow-hidden rounded-xl bg-white p-3 text-forest">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg bg-gray-100 text-4xl">
                      📦
                    </div>
                  )}

                  <h3 className="mt-3 font-bold">{selectedProduct.name}</h3>

                  <p className="text-xs text-muted">{selectedProduct.unit}</p>

                  <p className="mt-3 text-xl font-bold">
                    {formatKES(wholesalePrice)}
                  </p>

                  <p className="text-xs text-muted">
                    Retail price: {formatKES(retailPrice)}
                  </p>

                  {savings > 0 && (
                    <p className="mt-2 text-sm font-semibold text-green-700">
                      Save {savings}%
                    </p>
                  )}
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300">Shopper pays per unit</span>

                    <strong>
                      {formatKES(
                        wholesalePrice + Number(form.platform_charge || 0),
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300">Minimum quantity</span>

                    <strong>{form.min_quantity || 0}</strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300">Maximum quantity</span>

                    <strong>{form.max_quantity || 0}</strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-gray-300">Available stock</span>

                    <strong>{selectedProduct.stock_quantity ?? 0}</strong>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-white/10 p-4 text-xs leading-relaxed text-gray-200">
                  The campaign price is taken from the approved product. The
                  platform fee is added separately.
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-gray-300">
                Select an approved product to preview the campaign.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
