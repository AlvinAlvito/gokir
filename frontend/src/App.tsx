import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequireAuth from "./components/routing/RequireAuth";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

// Auth pages
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import SignUpOption from "./pages/AuthPages/SignUpOption";
import SignUpStore from "./pages/AuthPages/SignUpStore";
import SignUpDriver from "./pages/AuthPages/SignUpDriver";

// Dashboards (buat halaman placeholder kalau belum ada)
import NotFound from "./pages/OtherPage/NotFound";

// OPTIONAL: placeholder per-role
const CustomerDashboard = () => <div>Customer Dashboard</div>;
const StoreDashboard = () => <div>Store Dashboard</div>;
const DriverDashboard = () => <div>Driver Dashboard</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

// === Inline redirect component (Opsi A) ===
function RedirectToRoleDashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  const path =
    user.role === "CUSTOMER" ? "/dashboard/customer" :
    user.role === "STORE" ? "/dashboard/store" :
    user.role === "DRIVER" ? "/dashboard/driver" :
    "/dashboard/admin";
  return <Navigate to={path} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public auth routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup-option" element={<SignUpOption />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup-store" element={<SignUpStore />} />
          <Route path="/signup-driver" element={<SignUpDriver />} />

          {/* Protected app layout */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              {/* Root langsung redirect ke dashboard sesuai role */}
              <Route index element={<RedirectToRoleDashboard />} />

              {/* Role dashboards */}
              <Route path="/dashboard/customer" element={<CustomerDashboard />} />
              <Route path="/dashboard/store" element={<StoreDashboard />} />
              <Route path="/dashboard/driver" element={<DriverDashboard />} />
              <Route path="/dashboard/admin" element={<AdminDashboard />} />

              {/* Contoh leftover routes (tetap protected) */}
              <Route path="/profile" element={<div>Profile</div>} />
              <Route path="/calendar" element={<div>Calendar</div>} />
              <Route path="/blank" element={<div>Blank</div>} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
