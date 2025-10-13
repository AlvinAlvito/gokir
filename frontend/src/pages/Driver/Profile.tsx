import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Profil from "../../components/driver/Profil";



export default function Profile() {
  return (
    <>
      <PageBreadcrumb pageTitle="Profile" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="space-y-6">
          <Profil />
        </div>
      </div>
    </>
  );
}
