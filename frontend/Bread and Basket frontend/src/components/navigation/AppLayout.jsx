import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import BottomTabs from "./BottomTabs";
import "./Navigation.css";

// Use as a route wrapper (<Outlet />) OR wrap a page directly with children.
export default function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-layout__content">{children ?? <Outlet />}</main>
      <BottomTabs />
    </div>
  );
}