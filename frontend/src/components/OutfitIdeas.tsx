import { useAppContext } from "@/context/AppContext";
import { useState } from "react";

export default function OutfitIdeas() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAsWorn, setMarkingAsWorn] = useState<number | null>(null);
  
  const { BACKEND_URL, session } = useAppContext();

  const getRecommendations = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/recommendation/recommend?prompt=${query}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch recommendations");
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleWearToday = async (index: number, outfit: any) => {
    setMarkingAsWorn(index);
    try {
      // Extract IDs for both items in the outfit
      const itemIds = [outfit.top?.id, outfit.bottom?.id].filter(Boolean);
      
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/wear-today`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ item_ids: itemIds })
      });

      if (response.ok) {
        // Remove the outfit from the list or show a success state
        setRecommendations(prev => prev.filter((_, i) => i !== index));
        alert("Outfit logged! Your rotation scores have been updated.");
      }
    } catch (error) {
      console.error("Error updating wear status:", error);
    } finally {
      setMarkingAsWorn(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 relative z-10">
      {/* Search Header */}
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl mb-12">
        <h2 className="text-3xl font-bold mb-2 text-white tracking-tight">Contextual Dress Me</h2>
        <p className="text-gray-400 mb-8">Ask the AI for an outfit based on occasion, weather, or vibe.</p>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'Formal wear for an interview'..."
            className="flex-1 px-6 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <button
            onClick={getRecommendations}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            {loading ? "Designing..." : "Suggest Outfit"}
          </button>
        </div>
      </div>

      {/* Recommendations Grid */}
      {recommendations.length > 0 && (
        <div className="space-y-8 pb-12">
          <h3 className="text-xl font-medium text-gray-300 px-2">Tailored Suggestions</h3>
          <div className="grid grid-cols-1 gap-6">
            {recommendations.map((result, index) => (
              <div key={index} className="group bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all">
                <div className="p-4 flex justify-between items-center border-b border-white/5 bg-white/5">
                  <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Concept {index + 1}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">Match Score: {(result.score * 100).toFixed(0)}%</span>
                    <button 
                      onClick={() => handleWearToday(index, result.outfit)}
                      disabled={markingAsWorn === index}
                      className="bg-white/10 hover:bg-white/20 text-white text-[10px] px-3 py-1.5 rounded-lg border border-white/10 transition-colors uppercase font-bold tracking-tighter"
                    >
                      {markingAsWorn === index ? "Updating..." : "Wear Today"}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-1 p-1">
                  {['top', 'bottom'].map((slot) => (
                    <div key={slot} className="relative aspect-3/4 overflow-hidden bg-black/20">
                      <img 
                        src={result.outfit[slot]?.url} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        alt={slot} 
                      />
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] uppercase text-white">
                        {slot}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}