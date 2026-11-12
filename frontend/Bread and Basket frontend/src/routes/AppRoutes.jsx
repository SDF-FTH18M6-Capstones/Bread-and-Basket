import { Routes, Route } from "react-router-dom";
import LandingPage from "../features/landing/LandingPage";
import ShopHome from "../features/shop/ShopHome";
import SellerHome from "../features/seller/SellerHome";
import AdminHome from "../features/admin/AdminHome";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/shop" element={<ShopHome />} />
      <Route path="/seller" element={<SellerHome />} />
      <Route path="/admin" element={<AdminHome />} />
    </Routes>
  );
}
