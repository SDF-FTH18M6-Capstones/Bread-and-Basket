import { Outlet } from "react-router-dom";
import Navbar from "./components/navigation/Navbar";
import BottomTabs from "./components/navigation/BottomTabs";
// import "./Navigation.css";

// Use as a route wrapper (<Outlet />) OR wrap a page directly with children.
export default function Layout() {
  return (
    <>
      <Navbar />
      <main >
         <Outlet />
      </main>
      <BottomTabs />
    </>
  );
}