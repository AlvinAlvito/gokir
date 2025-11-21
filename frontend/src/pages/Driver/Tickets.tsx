import PageMeta from "../../components/common/PageMeta";
import DriverTickets from "../../components/driver/Tickets";

export default function DriverTicketsPage() {
  return (
    <>
      <PageMeta
        title="Tiket Driver"
        description="Kelola tiket transaksi driver"
      />
      <DriverTickets />
    </>
  );
}
