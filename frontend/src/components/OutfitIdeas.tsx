import { useEffect, useState } from "react";

interface Recommendation {
  id: number;
  image_url: string;
  title: string;
  liked_by: string;
  suitable_for: string;
  season: string;
  confidence: number;
}

export default function OutfitIdeas() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/recommendations");

      if (!response.ok) {
        throw new Error("API failed");
      }

      const data = await response.json();

      console.log("API RESPONSE:", data);

      // SAFE CHECK
      if (Array.isArray(data)) {
        setRecommendations(data);
      } else if (Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }

    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  if (loading) return <div>Loading AI Recommendations...</div>;

  return (
    <div className="grid grid-cols-3 gap-6">
      {recommendations.map((item) => (
        <div key={item.id} className="bg-white p-4 shadow rounded">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-52 object-cover rounded"
          />

          <h3 className="mt-3 font-semibold">{item.title}</h3>

          <p className="text-sm text-gray-500">
            ❤️ Liked by: {item.liked_by}
          </p>

          <p className="text-sm text-gray-500">
            🎯 Suitable for: {item.suitable_for}
          </p>

          <p className="text-sm text-gray-500">
            🌤 Season: {item.season}
          </p>

          <p className="text-sm text-blue-600 mt-1">
            AI Confidence: {item.confidence}%
          </p>
        </div>
      ))}
    </div>
  );
}