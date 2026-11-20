import { Routes, Route } from "react-router-dom";
import Layout from "../Layout";

import LandingPage from "../features/landing/LandingPage";

import ShopHome from "../features/shop/ShopHome";
import CampaignDetailPage from "../features/shop/CampaignDetailPage";

import AdminDashboardPage from "../features/admin/AdminDashboardPage";
import AdminHome from "../features/admin/AdminHome";
import AdminCampaignsPage from "../features/admin/AdminCampaignsPage";
import AdminCampaignDetailPage from "../features/admin/AdminCampaignDetailPage";
import AdminCampaignFormPage from "../features/admin/AdminCampaignFormPage";
import AdminOrdersPaymentsPage from "../features/admin/AdminOrdersPaymentsPage";

import OrdersPage from "../features/orders/ordersPage";
import OrderDetailPage from "../features/orders/ordersDetailPage";

import SellerDashboard from "../features/seller/SellerDashboard";
import SellerHome from "../features/seller/SellerHome";
import SellerCampaigns from "../features/seller/SellerCampaigns";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<Layout />}>
        {/* Consumer Routes */}
        <Route element={<ProtectedRoute allowedRoles={["consumer"]} />}>
          <Route path="/shop" element={<ShopHome />} />
          <Route
            path="/campaigns/:campaignId"
            element={<CampaignDetailPage />}
          />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Route>

        {/* Seller Routes */}
        <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/seller/products" element={<SellerHome />} />
          <Route path="/seller/campaigns" element={<SellerCampaigns />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/approvals" element={<AdminHome />} />
          <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
          <Route
            path="/admin/campaigns/new"
            element={<AdminCampaignFormPage />}
          />
          <Route
            path="/admin/campaigns/:campaignId/edit"
            element={<AdminCampaignFormPage />}
          />
          <Route
            path="/admin/campaigns/:campaignId"
            element={<AdminCampaignDetailPage />}
          />
          <Route path="/admin/orders" element={<AdminOrdersPaymentsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
