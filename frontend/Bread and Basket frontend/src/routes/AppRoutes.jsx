import { Routes, Route } from "react-router-dom";
import Layout from "../Layout";

import LandingPage from "../features/landing/LandingPage";
import ShopHome from "../features/shop/ShopHome";
import CampaignDetailPage from "../features/shop/CampaignDetailPage";

import SellerHome from "../features/seller/SellerHome";
import SellerCampaigns from "../features/seller/SellerCampaigns";

import AdminHome from "../features/admin/AdminHome";

import OrdersPage from "../features/orders/ordersPage";
import OrderDetailPage from "../features/orders/ordersDetailPage";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<Layout />}>
        <Route element={<ProtectedRoute allowedRoles={["consumer"]} />}>
          <Route path="/shop" element={<ShopHome />} />

          <Route
            path="/campaigns/:campaignId"
            element={<CampaignDetailPage />}
          />

          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
          <Route path="/seller" element={<SellerHome />} />
          <Route path="/seller/campaigns" element={<SellerCampaigns />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminHome />} />
        </Route>
      </Route>
    </Routes>
  );
}