import Availability from "../../components/store/Availability";
import PageMeta from "../../components/common/PageMeta";

export default function StoreAvailabilityPage() {
  return (
    <>
      <PageMeta title="Ketersediaan Toko" description="Atur status dan jadwal buka toko" />
      <Availability />
    </>
  );
}
