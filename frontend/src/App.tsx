import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import ImageUpload from "./components/ImageUpload";
import Insights from "./components/Insights";
import { Login } from "./components/Login";
import OutfitCalendar from "./components/OutfitCalendar";
import OutfitIdeas from "./components/OutfitIdeas";
import Settings from "./components/Settings";
import Wardrobe from "./components/Wardrobe";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Dashboard />}>
          <Route path="/wardrobe" element={<Wardrobe />} />
          <Route path="/upload" element={<ImageUpload />} />
          <Route path="/outfits" element={<OutfitIdeas />} />
          <Route path="/calendar" element={<OutfitCalendar />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/wardrobe" replace />} />
      </Routes>
    </div>
  );
}

export default App;
