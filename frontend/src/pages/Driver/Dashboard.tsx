import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
// import DriverWeeklyOrdersChart from "../../components/driver/DriverWeeklyOrdersChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import PageMeta from "../../components/common/PageMeta";
import Slider from "../../components/driver/Slider";
import DriverAvailability from "../../components/driver/Availability";

export default function Dashboard() {
  return (
    <>
      <PageMeta
        title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 items-start">
          <div className="space-y-4">
            <Slider />
            <DriverAvailability />
          </div>
          <div className="space-y-4">
            <EcommerceMetrics compact />
            {/* <DriverWeeklyOrdersChart /> */}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-5 space-y-4">
            <MonthlyTarget />
          </div>
        </div>
      </div>
    </>
  );
}
