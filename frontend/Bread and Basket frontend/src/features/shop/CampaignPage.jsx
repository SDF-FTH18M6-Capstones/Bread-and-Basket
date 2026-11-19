import SellerCampaigns from "../components/SellerCampaigns";

export default function CampaignPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Campaign Orders
      </h1>

      <SellerCampaigns />
    </div>
  );
}