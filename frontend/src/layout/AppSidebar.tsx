import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

type Role = "CUSTOMER" | "STORE" | "DRIVER" | "ADMIN" | "SUPERADMIN";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// ====== MENU DEFINITIONS BERDASARKAN ROLE ======
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  CUSTOMER: [
    { icon: <GridIcon />, name: "Dashboard", path: "/dashboard/customer" },
    { icon: <UserCircleIcon />, name: "Profil", path: "/profile/customer" },
    { icon: <ListIcon />, name: "Pesan Makanan", path: "/orders/food" },
    { icon: <TableIcon />, name: "Keranjang", path: "/cart" },
    { icon: <TableIcon />, name: "Orderan Kamu", path: "/orders" },
    { icon: <ListIcon />, name: "Antar Penumpang", path: "/orders/ride" },
    {
      icon: <TableIcon />,
      name: "Riwayat",
      subItems: [{ name: "Semua Riwayat", path: "/history" }],
    },

  ],
  STORE: [
     { icon: <GridIcon />, name: "Dashboard", path: "/dashboard/store" },
     { icon: <UserCircleIcon />, name: "Profil Toko", path: "/profile/store" },
    { icon: <PageIcon />, name: "Ketersediaan", path: "/store/availability" },
    { icon: <PageIcon />, name: "Tiket", path: "/store/tickets" },
    { icon: <ListIcon />, name: "Menu", path: "/store/menu" },
    { icon: <TableIcon />, name: "Pesanan", path: "/pesanan/store" },
     { icon: <TableIcon />, name: "Riwayat", path: "/riwayat/store" },
    { icon: <CalenderIcon />, name: "Jam Operasional", path: "s/chedule/store" },
  ],
  DRIVER: [
    { icon: <GridIcon />, name: "Dashboard", path: "/dashboard/driver" },
    { icon: <UserCircleIcon />, name: "Profil", path: "/profile/driver" },
    { icon: <PageIcon />, name: "Ketersediaan", path: "/driver/availability" },
    { icon: <PageIcon />, name: "Tiket", path: "/driver/tickets" },
    { icon: <ListIcon />, name: "List Order", path: "/driver/list-order" },
    { icon: <TableIcon />, name: "Order Proses", path: "/driver/order-proses" },
    {
      icon: <PageIcon />,
      name: "Status & Dokumen",
      path: "/driver/documents",
    },
    {
      icon: <ListIcon />,
      name: "Tugas",
      subItems: [
        { name: "Aktif", path: "/driver/active" },
        { name: "Riwayat", path: "/driver/history" },
      ],
    },


  ],
  ADMIN: [
    { icon: <GridIcon />, name: "Dashboard", path: "/dashboard/admin" },
    {
      icon: <ListIcon />,
      name: "Verifikasi",
      subItems: [{ name: "Driver", path: "/admin/driver" }, { name: "Toko", path: "/admin/toko" }],
    },
    { icon: <PageIcon />, name: "Announcements", path: "/admin/announcements" },
    { icon: <GridIcon />, name: "Driver", path: "/driver/admin" },
    { icon: <GridIcon />, name: "Toko", path: "/toko/admin" },
  ],

  SUPERADMIN: [
    { icon: <GridIcon />, name: "Dashboard", path: "/dashboard/superadmin" },
    {
      icon: <ListIcon />,
      name: "Verifikasi",
      subItems: [{ name: "Driver", path: "/superadmin/driver" }, { name: "Toko", path: "/superadmin/toko" }],
    },
    { icon: <PageIcon />, name: "Announcements", path: "/superadmin/announcements" },
    { icon: <PageIcon />, name: "Tiket", path: "/superadmin/tickets" },
    { icon: <GridIcon />, name: "Driver", path: "/driver/superadmin" },
    { icon: <GridIcon />, name: "Toko", path: "/toko/superadmin" },
    { icon: <PlugInIcon />, name: "System Config", path: "/admin/system" },
  ],
};

// Section Others saat BELUM login (auth links)
const AUTH_SECTION: NavItem[] = [
  {
    icon: <PlugInIcon />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin" },
      { name: "Sign Up Customer", path: "/signup" },
      { name: "Sign Up Store", path: "/signup-store" },
      { name: "Sign Up Driver", path: "/signup-driver" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { user } = useAuth();
  const location = useLocation();

  // ==== DYNAMIC ITEMS (GANTI SISI DATA SAJA, FUNGSI RENDER TETAP) ====
  const navItems = useMemo<NavItem[]>(() => {
    if (!user) return []; // belum login → main kosong
    return NAV_BY_ROLE[user.role] ?? [];
  }, [user]);

  const othersItems = useMemo<NavItem[]>(() => {
    if (!user) return AUTH_SECTION; // belum login tampilkan Authentication
    return []; // sudah login, kosongkan Others (atau isi nanti kalau perlu)
  }, [user]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ([
      { t: "main" as const, items: navItems },
      { t: "others" as const, items: othersItems },
    ]).forEach(({ t, items }) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((sub) => {
            if (sub.path && isActive(sub.path)) {
              setOpenSubmenu({ type: t, index });
              submenuMatched = true;
            }
          });
        }
      });
    });
    if (!submenuMatched) setOpenSubmenu(null);
  }, [location, isActive, navItems, othersItems]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) return null;
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={`${menuType}-${nav.name}`}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={`${menuType}-${nav.name}-${subItem.name}`}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Others" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
