import PageMeta from "../../components/common/PageMeta";
import DriverAvailability from "../../components/driver/Availability";

export default function AvailabilityPage() {
  return (
    <>
      <PageMeta
        title="Ketersediaan Driver"
        description="Atur status ketersediaan dan area operasional"
      />
      <DriverAvailability />
    </>
  );
}
