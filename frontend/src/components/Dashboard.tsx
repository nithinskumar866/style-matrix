import { useAppContext } from "@/context/AppContext";
import { motion } from "framer-motion";
import { BarChart3, CalendarDays, Camera, LayoutGrid, Settings, Sparkles, User } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { name: "Wardrobe", path: "/wardrobe", icon: LayoutGrid },
  { name: "Upload", path: "/upload", icon: Camera },
  { name: "Outfit Ideas", shortName: "Ideas", path: "/outfits", icon: Sparkles },
  { name: "Calendar", path: "/calendar", icon: CalendarDays },
  { name: "Insights", path: "/insights", icon: BarChart3 },
  { name: "Settings", path: "/settings", icon: Settings },
];

// --- Main Dashboard Component ---
export default function Dashboard() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Subtle background glow */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-linear-to-br from-indigo-950 via-background to-rose-950" />

      <Sidebar />
      <BottomNav />

      <main className="relative z-10 px-4 pt-6 pb-24 md:pl-72 md:pr-8 md:pt-8 md:pb-8">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

// --- Sidebar Component, for larger screens ---
const Sidebar = () => {
  const { user } = useAppContext();

  return (
    <aside
      className="hidden md:flex fixed z-20 top-4 bottom-4 left-4 w-64 p-6 rounded-2xl flex-col
                 bg-card/70 backdrop-blur-xl border shadow-2xl"
    >
      <h1 className="text-2xl font-bold tracking-tighter mb-10">Style Matrix</h1>

      <nav className="grow">
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-3 pt-6 border-t">
        <div className="w-10 h-10 shrink-0 rounded-full bg-muted flex items-center justify-center border">
          <User className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold truncate">{user?.email || "..."}</p>
      </div>
    </aside>
  );
};

// --- Bottom navigation, for phones ---
const BottomNav = () => (
  <nav aria-label="Main" className="md:hidden fixed z-20 bottom-0 inset-x-0 border-t bg-card/95 backdrop-blur-xl">
    <ul className="grid grid-cols-6">
      {NAV_ITEMS.map((item) => (
        <li key={item.path}>
          <NavLink
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                isActive ? "text-indigo-300" : "text-muted-foreground"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.shortName ?? item.name}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
