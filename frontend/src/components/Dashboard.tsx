// import { useState } from "react";
// import { supabase } from "../lib/supabaseClient";
import ImageUpload from "./ImageUpload";
import Wardrobe from "./Wardrobe";
import OutfitIdeas from "./OutfitIdeas";
import Settings from "./Settings";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("dashboard");
const [user, setUser] = useState<any>(null);

useEffect(() => {
  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  getUser();
}, []);
  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <div className="w-60 bg-white shadow-md p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-8">Style Matrix</h2>

          <nav className="space-y-4">
            <button onClick={() => setActivePage("dashboard")} className="block w-full text-left">Dashboard</button>
            <button onClick={() => setActivePage("closet")} className="block w-full text-left">My Closet</button>
            <button onClick={() => setActivePage("outfits")} className="block w-full text-left">Outfit Ideas</button>
            <button onClick={() => setActivePage("settings")} className="block w-full text-left">Settings</button>
          </nav>
        </div>

        {/* Profile Section */}
        <div className="flex items-center gap-3">
          <img
            src={
                user?.user_metadata?.avatar_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`
            }
            className="rounded-full w-10 h-10"
            />
          <div>
            <p className="text-sm font-medium">Signed in by </p>
            <p className="text-xs text-gray-500">  
                {user?.email || "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 relative">

        {/* Search Bar */}
        <div className="flex justify-between items-center mb-8">
          <input
            type="text"
            placeholder="Search your wardrobe..."
            className="w-1/2 px-4 py-2 border rounded"
          />

          <button
            onClick={() => setActivePage("upload")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Add New Item
          </button>
        </div>

        {/* Page Content */}
        {activePage === "dashboard" && (
          <div className="text-gray-600">Welcome to your wardrobe dashboard.</div>
        )}

        {activePage === "closet" && <Wardrobe />}

        {activePage === "upload" && <ImageUpload />}

        {activePage === "outfits" && <OutfitIdeas />}

        {activePage === "settings" && <Settings />}

        {/* Floating + Button */}
        <button
          onClick={() => setActivePage("upload")}
          className="fixed bottom-8 right-8 bg-blue-600 text-white w-14 h-14 rounded-full text-3xl shadow-lg"
        >
          +
        </button>
      </div>
    </div>
  );
  
}