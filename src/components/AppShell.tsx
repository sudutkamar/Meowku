import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  Database,
  Clock3,
  FileBarChart,
  Home,
  Languages,
  Menu,
  Moon,
  PawPrint,
  Settings,
  ShoppingBag,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { UIPreferencesProvider, useUIPreferences } from "./UIPreferences";
import { LanguageRuntime } from "./LanguageRuntime";
import type { Household } from "../lib/types";
import { supabase } from "../lib/supabase";
import {
  fetchProfile,
  ProfileSettings,
} from "../features/settings/ProfileSettings";

export const navigation = [
  ["Dashboard", Home],
  ["Jadwal", CalendarDays],
  ["Katalog", ShoppingBag],
  ["Kucing", PawPrint],
  ["Litter Box", ClipboardList],
  ["Histori", Clock3],
  ["Laporan", FileBarChart],
  ["Pengaturan Jadwal", Settings],
  ["Pengguna", Users],
  ["Database", Database],
  ["Pengaturan", Settings],
] as const satisfies readonly (readonly [string, LucideIcon])[];

const englishLabels: Record<string, string> = {
  Dashboard: "Dashboard",
  Jadwal: "Schedule",
  "Riwayat Jadwal": "My schedules",
  Katalog: "Catalog",
  Kucing: "Cats",
  "Litter Box": "Litter Boxes",
  Histori: "History",
  Laporan: "Reports",
  "Pengaturan Jadwal": "Schedule Settings",
  Pengguna: "Members",
  Database: "Database",
  Pengaturan: "Settings",
};
type AppShellProps = {
  email: string;
  householdId: string;
  households?: Household[];
  onHouseholdChange?: (householdId: string) => void;
  onSignOut: () => void;
  children: ReactNode;
};

function ShellContent({
  email,
  householdId,
  households = [],
  onHouseholdChange,
  onSignOut,
  children,
}: AppShellProps) {
  const {
    language,
    theme,
    sidebarCollapsed,
    setLanguage,
    setTheme,
    toggleSidebar,
  } = useUIPreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const location = useLocation();
  const navigateRouter = useNavigate();
  const activePage = Object.entries({
    "/app": "Dashboard",
    "/app/jadwal": "Jadwal",
    "/app/riwayat-jadwal": "Riwayat Jadwal",
    "/app/katalog": "Katalog",
    "/app/kucing": "Kucing",
    "/app/litter-box": "Litter Box",
    "/app/histori": "Histori",
    "/app/laporan": "Laporan",
    "/app/pengaturan-jadwal": "Pengaturan Jadwal",
    "/app/pengguna": "Pengguna",
    "/app/database-pengguna": "Database",
    "/app/pengaturan": "Pengaturan",
  }).find(([path]) => location.pathname === path)?.[1] ?? "Dashboard";
  const profile = useQuery({
    queryKey: ["profile-settings"],
    enabled: Boolean(email),
    queryFn: fetchProfile,
  });
  const householdAccess = useQuery({
    queryKey: ["household-access", householdId],
    enabled: Boolean(supabase && householdId),
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await supabase.rpc("household_access", { requested_household_id: householdId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const isEnglish = language === "en";
  const canAccessAdmin = householdAccess.data?.role === 'owner' || householdAccess.data?.role === 'admin';
  const adminNavigation = new Set(['Laporan', 'Pengaturan Jadwal', 'Pengguna', 'Database', 'Pengaturan']);
  const isScheduleRoute = activePage === "Jadwal" || activePage === "Riwayat Jadwal";
  useEffect(() => {
    if (isScheduleRoute) setScheduleOpen(true);
  }, [isScheduleRoute]);
  useEffect(() => {
    if (!mobileOpen && !profileOpen) return;
    if (profileOpen) document.querySelector<HTMLElement>('.profile-modal-close')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setProfileOpen(false);
      }
      if (profileOpen && event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('.profile-modal');
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute('disabled'));
        if (focusable.length < 2) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, profileOpen]);
  useEffect(() => {
    if (!mobileOpen && !profileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen, profileOpen]);
  const labelFor = (label: string) =>
    isEnglish ? englishLabels[label] ?? label : label === "Riwayat Jadwal" ? "Jadwal saya" : label;
  const paths: Record<string, string> = {
    Dashboard: "/app",
    Jadwal: "/app/jadwal",
    "Riwayat Jadwal": "/app/riwayat-jadwal",
    Katalog: "/app/katalog",
    Kucing: "/app/kucing",
    "Litter Box": "/app/litter-box",
    Histori: "/app/histori",
    Laporan: "/app/laporan",
    "Pengaturan Jadwal": "/app/pengaturan-jadwal",
    Pengguna: "/app/pengguna",
    Database: "/app/database-pengguna",
    Pengaturan: "/app/pengaturan",
  };
  const navigate = (label: string) => {
    void navigateRouter({ to: paths[label] ?? "/app" });
    setMobileOpen(false);
  };
  const nav = (
    <nav
      id="primary-navigation"
      aria-label={isEnglish ? "Main navigation" : "Navigasi utama"}
    >
      {navigation.map(([label, Icon], index) => {
        if (adminNavigation.has(label) && !canAccessAdmin) return null;
        return (
        <span key={label}>
          {index === 6 && <div className="nav-label">ADMIN</div>}
          {label === "Jadwal" ? <>
            <button
              type="button"
              className={`nav-item nav-parent${isScheduleRoute ? " active" : ""}`}
              aria-current={isScheduleRoute ? "page" : undefined}
              aria-expanded={scheduleOpen}
              aria-controls="schedule-submenu"
              title={sidebarCollapsed ? labelFor(label) : undefined}
              onClick={() => setScheduleOpen((value) => !value)}
            >
              <Icon className="nav-icon" size={21} aria-hidden="true" />
              <span className="nav-label-text">{labelFor(label)}</span>
              <ChevronDown className="nav-chevron" size={17} aria-hidden="true" />
            </button>
            {scheduleOpen && <div id="schedule-submenu" className="nav-submenu" role="group" aria-label={isEnglish ? "Schedule options" : "Pilihan jadwal"}>
              <button type="button" className={activePage === "Jadwal" ? "active" : ""} aria-current={activePage === "Jadwal" ? "page" : undefined} onClick={() => navigate("Jadwal")}>{isEnglish ? "Add schedule" : "Tambah jadwal"}</button>
              <button type="button" className={activePage === "Riwayat Jadwal" ? "active" : ""} aria-current={activePage === "Riwayat Jadwal" ? "page" : undefined} onClick={() => navigate("Riwayat Jadwal")}>{labelFor("Riwayat Jadwal")}</button>
            </div>}
          </> : <button
            type="button"
            className={activePage === label ? "nav-item active" : "nav-item"}
            aria-current={activePage === label ? "page" : undefined}
            title={sidebarCollapsed ? labelFor(label) : undefined}
            onClick={() => navigate(label)}
          >
            <Icon className="nav-icon" size={21} aria-hidden="true" />
            <span className="nav-label-text">{labelFor(label)}</span>
          </button>}
        </span>
        );
      })}
    </nav>
  );
  const mobileNavigation = [
    { key: "Dashboard", Icon: Home },
    { key: "Riwayat Jadwal", Icon: Clock3 },
    { key: "Kucing", Icon: PawPrint },
    { key: "Litter Box", Icon: ClipboardList },
  ] as const;
  return (
    <div className={`app${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside
        className={`sidebar${mobileOpen ? " mobile-open" : ""}`}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Sidebar"
      >
        <div className="brand">
          <img
            src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp"
            alt="Logo Meowku"
          />
          <span>Meowku</span>
          <button
            type="button"
            className="close mobile-only"
            aria-label="Menutup menu"
            onClick={() => setMobileOpen(false)}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {households.length > 1 && <label className="mobile-household-switcher"><span>Rumah aktif</span><select aria-label="Pilih rumah aktif" value={householdId} onChange={(event) => onHouseholdChange?.(event.target.value)}>{households.map((item) => <option key={item.id} value={item.id}>{item.name ?? 'Rumah'}</option>)}</select></label>}
        {nav}
        <button
          type="button"
          className="sidebar-collapse desktop-only"
          aria-label="Buka atau ciutkan sidebar"
          aria-expanded={!sidebarCollapsed}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : (
            <ChevronLeft size={18} aria-hidden="true" />
          )}
          <span>{isEnglish ? "Collapse" : "Ciutkan"}</span>
        </button>
      </aside>
      {mobileOpen && (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Tutup menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main>
        <header>
          <button
            type="button"
            className="menu mobile-only"
            aria-label="Buka menu"
            aria-controls="primary-navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="mobile-brand">
            <img
              src="/UI/Meowku_Logo_Kucing_Jam_Transparent.webp"
              alt="Logo Meowku"
            />
          </div>
          <GlobalSearch householdId={householdId} onNavigate={navigate} />
          <div className="header-right">
            {households.length > 1 && <label className="household-switcher"><span className="sr-only">Rumah aktif</span><select aria-label="Pilih rumah aktif" value={householdId} onChange={(event) => onHouseholdChange?.(event.target.value)}>{households.map((item) => <option key={item.id} value={item.id}>{item.name ?? 'Rumah'}</option>)}</select></label>}
            <NotificationBell
              householdId={householdId}
              onNavigate={navigate}
            />
            <button
              type="button"
              className="preference-button"
              aria-label={`Ganti tema, saat ini ${theme}`}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon size={18} aria-hidden="true" />
              ) : (
                <Sun size={18} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="preference-button language-button"
              aria-label={isEnglish ? "Change language to Indonesian" : "Ganti bahasa ke Inggris"}
              title={isEnglish ? "Change language to Indonesian" : "Ganti bahasa ke Inggris"}
              onClick={() => setLanguage(isEnglish ? "id" : "en")}
            >
              <Languages size={18} aria-hidden="true" />
              <span>{isEnglish ? "EN" : "ID"}</span>
            </button>
            <button
              type="button"
              className="avatar profile-avatar-button"
              aria-label="Edit profile"
              onClick={() => setProfileOpen(true)}
            >
              {profile.data?.avatar_url ? (
                <img src={profile.data.avatar_url} alt="" />
              ) : (
                (profile.data?.full_name || email || "M")[0].toUpperCase()
              )}
            </button>
            <button type="button" className="logout" aria-label={isEnglish ? "Sign out" : "Keluar"} onClick={onSignOut}>
              {isEnglish ? "Sign out" : "Keluar"}
            </button>
          </div>
        </header>
        <nav className="mobile-quick-nav" aria-label={isEnglish ? "Quick navigation" : "Navigasi cepat"}>
          {mobileNavigation.map(({ key, Icon }) => <button type="button" key={key} className={activePage === key ? 'active' : ''} aria-current={activePage === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon size={18} aria-hidden="true" /><span>{labelFor(key)}</span></button>)}
          <button type="button" className="mobile-quick-nav-more" onClick={() => setMobileOpen(true)}><Menu size={18} aria-hidden="true" /><span>{isEnglish ? 'More' : 'Menu lainnya'}</span></button>
        </nav>
        <section className="content">{children}</section>
        {profileOpen && (
          <div
            className="profile-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setProfileOpen(false);
            }}
          >
            <div
              className="profile-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-modal-title"
            >
              <button
                type="button"
                className="profile-modal-close"
                aria-label="Tutup edit profile"
                onClick={() => setProfileOpen(false)}
              >
                <X size={18} />
              </button>
              <div id="profile-modal-title">
                <ProfileSettings
                  embedded
                  onSaved={() => setProfileOpen(false)}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <UIPreferencesProvider>
      <LanguageRuntime />
      <ShellContent {...props} />
    </UIPreferencesProvider>
  );
}
