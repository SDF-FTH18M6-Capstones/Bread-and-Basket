import { Routes, Route } from "react-router-dom";
import Layout from "../Layout";

import LandingPage from "../features/landing/LandingPage";
import ShopHome from "../features/shop/ShopHome";
import CampaignDetailPage from "../features/shop/CampaignDetailPage";

import SellerHome from "../features/seller/SellerHome";

import AdminHome from "../features/admin/AdminHome";
import AdminCampaignsPage from "../features/admin/AdminCampaignsPage";
import AdminCampaignDetailPage from "../features/admin/AdminCampaignDetailPage";
import AdminCampaignFormPage from "../features/admin/AdminCampaignFormPage";

import OrdersPage from "../features/orders/ordersPage";
import OrderDetailPage from "../features/orders/ordersDetailPage";
import { HomePage } from "../features/home/HomePage";

import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<Layout/>}>
        {/* Consumer routes */}
      <Route element={<ProtectedRoute allowedRoles={["consumer"]} />}>
        <Route path="/shop" element={<ShopHome />} />
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
      </Route>

      {/* Seller routes */}
      <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>
        <Route path="/seller" element={<><HomePage role="seller" /><SellerHome /></>} />
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<><HomePage role="admin" /><AdminHome /></>} />
      </Route>
      </Route>
    </Routes>
  );
}