import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequireAuth from "./components/routing/RequireAuth";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import LandingPage from "./pages/Landing";

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
import AdminStore from "./components/admin/Store";

// Superadmin
import SuperAdminAnnouncements from "./pages/Admin/Announcements";
import AdminTickets from "./components/admin/Tickets";
import SupportReportsPage from "./pages/Admin/SupportReports";
import TransactionsMonitorPage from "./pages/Admin/TransactionsMonitor";
import UsersManagePage from "./pages/Admin/UsersManage";
import DeliveryPricingPage from "./pages/Admin/DeliveryPricing";
import SuperadminTutorialSupportPage from "./pages/SuperAdmin/TutorialSupport";


// Customer
import CustomerDashboard from "./pages/Customer/Dashboard";
import CustomerProfil from "./pages/Customer/Profil";
import OrdersFood from "./pages/Customer/OrdersFood";
import StoreDetail from "./pages/Customer/StoreDetail";
import CustomerOrdersPage from "./pages/Customer/Orders";
import CustomerCartPage from "./pages/Customer/Cart";
import CustomerOrderProsesPage from "./pages/Customer/OrderProses";
import RideOrderPage from "./pages/Customer/Ride";

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
import StoreMenuPage from "./pages/Store/Menu";
import StoreOrdersPage from "./pages/Store/Orders";
import StoreOrdersHistoryPage from "./pages/Store/OrdersHistory";
import DriverListOrderPage from "./pages/Driver/ListOrder";
import DriverOrderProsesPage from "./pages/Driver/OrderProses";
import DriverOrdersPage from "./pages/Driver/Orders";
import CustomerTutorialSupportPage from "./pages/Customer/TutorialSupport";
import DriverTutorialSupportPage from "./pages/Driver/TutorialSupport";
import StoreTutorialSupportPage from "./pages/Store/TutorialSupport";

// Dashboards (buat halaman placeholder kalau belum ada)
import NotFound from "./pages/OtherPage/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Public auth routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup-option" element={<SignUpOption />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/signup-store" element={<SignUpStore />} />
          <Route path="/signup-driver" element={<SignUpDriver />} />

          {/* Protected app layout */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              {/* Admin */}
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
              <Route path="/driver/admin" element={<AdminDriver />} />
              <Route path="/admin/drivers/:id" element={<AdminDriverProfil />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />

              {/* Superadmin */}
              <Route path="/dashboard/superadmin" element={<AdminDashboard />} />
              <Route path="/superadmin/announcements" element={<SuperAdminAnnouncements />} />
              <Route path="/superadmin/reports" element={<SupportReportsPage />} />
              <Route path="/superadmin/transactions" element={<TransactionsMonitorPage />} />
              <Route path="/superadmin/users" element={<UsersManagePage />} />
              <Route path="/superadmin/pricing" element={<DeliveryPricingPage />} />
              <Route path="/superadmin/tutorial-support" element={<SuperadminTutorialSupportPage />} />

              {/* Customer routes */}
              <Route path="/dashboard/customer" element={<CustomerDashboard />} />
              <Route path="/profile/customer" element={<CustomerProfil />} />
              <Route path="/orders/food" element={<OrdersFood />} />
              <Route path="/orders/food/:id" element={<StoreDetail />} />
              <Route path="/orders/ride" element={<RideOrderPage />} />
              <Route path="/orders" element={<CustomerOrdersPage />} />
              <Route path="/orders/active" element={<CustomerOrderProsesPage />} />
              <Route path="/cart" element={<CustomerCartPage />} />
              <Route path="/tutorial-support/customer" element={<CustomerTutorialSupportPage />} />

              {/* Store routes */}
              <Route path="/dashboard/store" element={<StoreDashboard />} />
              <Route path="/profile/store" element={<StoreProfil />} />
              <Route path="/store/availability" element={<StoreAvailability />} />
              <Route path="/store/tickets" element={<StoreTickets />} />
              <Route path="/store/menu" element={<StoreMenuPage />} />
              <Route path="/pesanan/store" element={<StoreOrdersPage />} />
              <Route path="/store/orders" element={<StoreOrdersHistoryPage />} />
              <Route path="/tutorial-support/store" element={<StoreTutorialSupportPage />} />

              {/* Driver routes */}
              <Route path="/dashboard/driver" element={<DriverDashboard />} />
              <Route path="/profile/driver" element={<DriverProfil />} />
              <Route path="/driver/availability" element={<DriverAvailability />} />
              <Route path="/driver/tickets" element={<DriverTickets />} />
              <Route path="/driver/list-order" element={<DriverListOrderPage />} />
              <Route path="/driver/order-proses" element={<DriverOrderProsesPage />} />
              <Route path="/driver/order-proses/:id" element={<DriverOrderProsesPage />} />
              <Route path="/driver/orders" element={<DriverOrdersPage />} />
              <Route path="/tutorial-support/driver" element={<DriverTutorialSupportPage />} />

              {/* Superadmin */}
              <Route path="/driver/superadmin" element={<AdminDriver />} />
              <Route path="/toko/superadmin" element={<AdminStore />} />
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
