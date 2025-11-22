import PageMeta from "../../components/common/PageMeta";
import MenuManager from "../../components/store/MenuManager";

export default function StoreMenuPage() {
  return (
    <>
      <PageMeta title="Menu Toko" description="Kelola menu, opsi, dan kategori toko" />
      <MenuManager />
    </>
  );
}
