import Tickets from "../../components/store/Tickets";
import PageMeta from "../../components/common/PageMeta";

export default function StoreTicketsPage() {
  return (
    <>
      <PageMeta title="Tiket Store" description="Kelola tiket transaksi store" />
      <Tickets />
    </>
  );
}
