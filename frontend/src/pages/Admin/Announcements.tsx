import PageMeta from "../../components/common/PageMeta";
import AnnouncementsAdmin from "../../components/admin/Announcements";

export default function AdminAnnouncements() {
  return (
    <>
      <PageMeta
        title="Announcements | Admin"
        description="Kelola slider/pengumuman untuk semua role."
      />
      <AnnouncementsAdmin />
    </>
  );
}
