import { useEffect, useState } from "react";
import { getAdminCampaigns } from "../../api/adminCampaigns";
import { getCampaignOrders } from "../../api/adminOrders";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "successful", label: "Successful" },
  { value: "refunded", label: "Refunded" },
];

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount) {
  if (amount === undefined || amount === null || amount === "") {
    return "—";
  }

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatStatus(status) {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPaymentDetails(order) {
  const refund = order.refund || order.payment?.refund;
  const payment = order.payment || {};

  const isRefunded =
    Boolean(refund) ||
    payment.status === "refunded" ||
    order.payment_status === "refunded";

  if (isRefunded) {
    return {
      label: "Refunded",
      refunded: true,
      refund,
    };
  }

  const status = payment.status || order.payment_status;

  if (status === "successful" || status === "paid") {
    return {
      label: "Successful",
      refunded: false,
      refund: null,
    };
  }

  return {
    label: status ? formatStatus(status) : "Unavailable",
    refunded: false,
    refund: null,
  };
}

function PaymentBadge({ refunded, label }) {
  const styles = refunded
    ? "bg-red-100 text-red-700"
    : label === "Successful"
      ? "bg-green-100 text-green-700"
      : "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}

function OrderStatusBadge({ status }) {
  const normalized = status?.toLowerCase();

  const styles =
    normalized === "cancelled" || normalized === "refunded"
      ? "bg-red-100 text-red-700"
      : normalized === "completed" || normalized === "ready_for_collection"
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function getOrderValues(order) {
  const payment = getPaymentDetails(order);

  return {
    payment,
    orderNumber: order.order_no || order.id || "—",
    consumer: order.consumer?.full_name || order.consumer?.name || "—",
    campaign: order.campaignTitle || "—",
    amount: order.total_amount ?? order.payment?.amount ?? order.amount,
    reference:
      order.payment?.reference ||
      order.payment_reference ||
      order.reference ||
      "—",
    refundDescription: payment.refund
      ? `${payment.refund.reason || "Refunded"}${payment.refund.auto ? " · auto" : ""}`
      : "—",
  };
}

function OrderTableRow({ order }) {
  const values = getOrderValues(order);

  return (
    <tr className="border-b border-line last:border-0 transition hover:bg-gray-50">
      <td className="px-5 py-4">
        <p className="font-semibold text-forest">{values.orderNumber}</p>
        <p className="mt-1 text-xs text-muted">
          {formatDate(order.created_at)}
        </p>
      </td>

      <td className="px-5 py-4 text-sm text-forest">{values.consumer}</td>

      <td className="px-5 py-4 text-sm text-forest">{values.campaign}</td>

      <td className="px-5 py-4 text-sm font-medium text-forest">
        {formatAmount(values.amount)}
      </td>

      <td className="px-5 py-4 text-sm text-muted">{values.reference}</td>

      <td className="px-5 py-4">
        <PaymentBadge
          refunded={values.payment.refunded}
          label={values.payment.label}
        />
      </td>

      <td className="px-5 py-4">
        <OrderStatusBadge status={order.status} />
      </td>

      <td className="px-5 py-4 text-sm text-muted">
        {values.refundDescription}
      </td>
    </tr>
  );
}

function OrderCard({ order }) {
  const values = getOrderValues(order);

  return (
    <article className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-forest">{values.orderNumber}</p>
          <p className="mt-1 text-xs text-muted">
            {formatDate(order.created_at)}
          </p>
        </div>

        <PaymentBadge
          refunded={values.payment.refunded}
          label={values.payment.label}
        />
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Consumer</span>
          <span className="text-right font-medium text-forest">
            {values.consumer}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-muted">Campaign</span>
          <span className="text-right font-medium text-forest">
            {values.campaign}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-muted">Amount</span>
          <span className="text-right font-medium text-forest">
            {formatAmount(values.amount)}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-muted">Reference</span>
          <span className="break-all text-right text-forest">
            {values.payment.reference}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-muted">Order status</span>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-muted">Refund</span>
          <span className="text-right text-forest">
            {values.refundDescription}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function AdminOrdersPaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const campaigns = await getAdminCampaigns();
      const campaignList = Array.isArray(campaigns) ? campaigns : [];

      const results = await Promise.all(
        campaignList.map(async (campaign) => {
          const campaignOrders = await getCampaignOrders(campaign.id);

          return (Array.isArray(campaignOrders) ? campaignOrders : []).map(
            (order) => ({
              ...order,
              campaignTitle: campaign.title || "Unknown campaign",
            }),
          );
        }),
      );

      setOrders(results.flat());
    } catch (err) {
      setError(err.message || "Unable to load orders and payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const payment = getPaymentDetails(order);

    if (activeFilter === "refunded") return payment.refunded;

    if (activeFilter === "successful") {
      return payment.label === "Successful";
    }

    return true;
  });

  return (
    <main className="admin-main min-w-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest sm:text-3xl">
          Orders &amp; payments
        </h1>
      </div>

      <section className="mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeFilter === filter.value
                  ? "bg-forest text-white"
                  : "border border-line bg-white text-muted hover:border-forest hover:text-forest"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[18px] border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold text-forest">Order records</h2>
            <p className="mt-1 text-xs text-muted">
              {filteredOrders.length}{" "}
              {filteredOrders.length === 1 ? "order" : "orders"}
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-forest transition hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-muted">Loading orders and payments...</p>
          </div>
        ) : error ? (
          <div className="px-5 py-16 text-center">
            <p className="font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadOrders}
              className="mt-4 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <h3 className="font-semibold text-forest">No orders found</h3>
            <p className="mt-2 text-sm text-muted">
              {activeFilter === "all"
                ? "There are no orders to display yet."
                : `There are no ${activeFilter} orders to display.`}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-gray-50/70">
                    {[
                      "Order",
                      "Consumer",
                      "Campaign",
                      "Amount",
                      "Reference",
                      "Payment",
                      "Order status",
                      "Refund",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order, index) => (
                    <OrderTableRow
                      key={order.id || order.order_no || index}
                      order={order}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {filteredOrders.map((order, index) => (
                <OrderCard
                  key={order.id || order.order_no || index}
                  order={order}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
