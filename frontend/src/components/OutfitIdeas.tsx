// export default function OutfitIdeas() {
//   return (
//     <div className="text-gray-600">
//       AI Outfit Recommendations will appear here.
//     </div>
//   );
// }

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";

export default function OutfitIdeas() {
  const [query, setQuery] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { BACKEND_URL, session } = useAppContext();

  const getRecommendations = async () => {
    if (!query) return;
    setLoading(true);
    
    try {
      // Calls your FastAPI Recommendation Endpoint
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ query: query }),
      });

      if (!response.ok) throw new Error("Failed to fetch recommendations");
      
      const data = await response.json();
      setRecommendations(data.items || []); // Assuming backend returns { items: [...] }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold mb-2">Contextual Dress Me</h2>
        <p className="text-gray-500 mb-6">Ask the AI for an outfit based on occasion, weather, or vibe.</p>
        
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'Formal wear for an interview' or 'Beach party vibes'"
            className="flex-1 px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={getRecommendations}
            disabled={loading}
            className="bg-black text-white px-8 py-3 rounded font-semibold disabled:bg-gray-500"
          >
            {loading ? "Styling..." : "Suggest Outfit"}
          </button>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Top Matches</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((item, index) => (
              <div key={index} className="bg-white rounded overflow-hidden shadow-sm border border-gray-200">
                <img src={item.url} alt="Clothing item" className="w-full h-64 object-cover" />
                <div className="p-4">
                  <p className="font-semibold text-gray-800">Category: {item.category_label || item.category}</p>
                  <p className="text-sm text-green-600 mt-1">Match Score: {(item.similarity_score * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}