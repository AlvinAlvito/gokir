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

// Admin
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminDriver from "./pages/Admin/Driver";
import AdminDriverProfil from "./components/admin/ProfilDriver";
import AdminAnnouncements from "./pages/Admin/Announcements";

// Superadmin
import SuperAdminAnnouncements from "./pages/Admin/Announcements";
import AdminTickets from "./components/admin/Tickets";


// Customer
import CustomerDashboard from "./pages/Customer/Dashboard";
import CustomerProfil from "./pages/Customer/Profil";

// Store
import StoreProfil from "./pages/Store/Profile";
import StoreDashboard from "./pages/Store/Dashboard";

// Driver
import DriverDashboard from "./pages/Driver/Dashboard";
import DriverProfil from "./pages/Driver/Profile";
import DriverAvailability from "./pages/Driver/Availability";
import DriverTickets from "./pages/Driver/Tickets";
import StoreAvailability from "./pages/Store/Availability";
import StoreTickets from "./pages/Store/Tickets";

// Dashboards (buat halaman placeholder kalau belum ada)
import NotFound from "./pages/OtherPage/NotFound";

// === Inline redirect component (Opsi A) ===
function RedirectToRoleDashboard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/signin" replace />;
  const path =
    user.role === "CUSTOMER" ? "/dashboard/customer" :
    user.role === "STORE" ? "/dashboard/store" :
    user.role === "DRIVER" ? "/dashboard/driver" :
    user.role === "SUPERADMIN" ? "/dashboard/superadmin" :
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

              {/* Admin */}
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/driver/admin" element={<AdminDriver />} />
              <Route path="/admin/drivers/:id" element={<AdminDriverProfil />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />

              {/* Superadmin */}
              <Route path="/dashboard/superadmin" element={<AdminDashboard />} />
              <Route path="/superadmin/announcements" element={<SuperAdminAnnouncements />} />

              {/* Customer routes */}
              <Route path="/dashboard/customer" element={<CustomerDashboard />} />
              <Route path="/profile/customer" element={<CustomerProfil />} />

              {/* Store routes */}
              <Route path="/dashboard/store" element={<StoreDashboard />} />
              <Route path="/profile/store" element={<StoreProfil />} />
              <Route path="/store/availability" element={<StoreAvailability />} />
              <Route path="/store/tickets" element={<StoreTickets />} />

              {/* Driver routes */}
              <Route path="/dashboard/driver" element={<DriverDashboard />} />
              <Route path="/profile/driver" element={<DriverProfil />} />
              <Route path="/driver/availability" element={<DriverAvailability />} />
              <Route path="/driver/tickets" element={<DriverTickets />} />

              {/* Superadmin */}
              <Route path="/driver/superadmin" element={<AdminDriver />} />
              <Route path="/superadmin/tickets" element={<AdminTickets />} />

              <Route path="/dashboard/store" element={<StoreDashboard />} />
             

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
