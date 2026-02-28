import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Camera, Sparkles, Settings, User } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Import your page components
import Wardrobe from "./Wardrobe";
import OutfitIdeas from "./OutfitIdeas";
import SettingsPage from "./Settings";
import ImageUpload from "./ImageUpload"; // We will create the new version of this next

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [activePage, setActivePage] = useState("Wardrobe");

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Subtle background pattern for glass effect */}
      <div className="fixed inset-0 z-0 opacity-50">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-950 via-slate-950 to-rose-950"></div>
      </div>
      
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <main className="pl-72 pt-8 pr-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderPage(activePage)}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sidebar Component ---
const Sidebar = ({ activePage, setActivePage }: { activePage: string, setActivePage: (page: string) => void }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const navItems = [
    { name: "Wardrobe", icon: LayoutGrid },
    { name: "Upload", icon: Camera },
    { name: "Outfit Ideas", icon: Sparkles },
    { name: "Settings", icon: Settings },
  ];

  return (
    <motion.aside 
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed top-4 bottom-4 left-4 w-64 p-6 rounded-2xl flex flex-col
                 bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl"
    >
      <h1 className="text-2xl font-bold tracking-tighter mb-12">Style Matrix</h1>
      
      <nav className="grow">
        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.name}>
              <button
                onClick={() => setActivePage(item.name)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                           text-gray-300 hover:text-white transition-colors relative"
              >
                {activePage === item.name && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-white/10 rounded-lg"
                    style={{ borderRadius: 12 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  />
                )}
                <item.icon className="w-5 h-5 z-10" />
                <span className="z-10">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-3 pt-6 border-t border-white/10">
        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center border border-white/10">
          <User className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">{user?.email || "..."}</p>
          <p className="text-xs text-gray-400">Pro Member</p>
        </div>
      </div>
    </motion.aside>
  );
};

// --- Helper to render the correct page ---
const renderPage = (pageName: string) => {
  switch (pageName) {
    case "Wardrobe":
      return <Wardrobe />;
    case "Upload":
      return <ImageUpload />;
    case "Outfit Ideas":
      return <OutfitIdeas />;
    case "Settings":
      return <SettingsPage />;
    default:
      return <Wardrobe />;
  }
};
