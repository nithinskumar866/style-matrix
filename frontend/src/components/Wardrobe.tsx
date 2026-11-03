// import { useEffect, useState } from "react";

// export default function Wardrobe() {
//   const [images, setImages] = useState<string[]>([]);

//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/images")
//       .then((res) => res.json())
//       .then((data) => setImages(data.images))
//       .catch((err) => console.error(err));
//   }, []);

//   return (
//     <div className="grid grid-cols-3 gap-4">
//       {images.map((img, index) => (
//         <img
//           key={index}
//           src={`http://127.0.0.1:8000/uploads/${img}`}
//           className="w-full h-40 object-cover"
//         />
//       ))}
//     </div>
//   );
// }





// import { useEffect, useState } from "react";

// export default function Wardrobe() {
//   const [images, setImages] = useState<string[]>([]);

//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/images")
//       .then((res) => res.json())
//       .then((data) => setImages(data.images))
//       .catch((err) => console.error(err));
//   }, []);

//   return (
//     <div className="grid grid-cols-4 gap-4">
//       {images.map((img, index) => (
//         <img
//           key={index}
//           src={`http://127.0.0.1:8000/uploads/${img}`}
//           className="w-full h-40 object-cover rounded"
//         />
//       ))}
//     </div>
//   );
// }






// import { useEffect, useState } from "react";

// export default function Wardrobe() {
//   const [images, setImages] = useState<any[]>([]);

  
//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/items")
//       .then((res) => res.json())
//       .then((data) => {
//         setImages(data);
//       })
//       .catch((err) => console.error("Fetch error:", err));
//   }, []);

//   return (
//     <div className="grid grid-cols-4 gap-4">
//       {images.map((item, index) => (
//         <div key={index} className="border p-2 rounded">
//           <img
//             src={item.image_url}
//             alt="clothing"
//             className="w-full h-40 object-cover rounded"
//           />
//           <p className="text-sm mt-2 text-center">
//             Category: {item.category}
//           </p>
//         </div>
//       ))}
//     </div>
//   );
// }


import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";

export default function Wardrobe() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"available" | "laundry">("available");
  const [error, setError] = useState("");
  const { BACKEND_URL, session, logout } = useAppContext();

  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/wardrobe/items?count=100`, {
          headers: {
            "Authorization": `Bearer ${session?.access_token}`
          }
        });
        
        // The session is no longer valid, so send the user back to login
        if (response.status === 401) {
          await logout();
          return;
        }
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setImages(data?.results || []);
        setError("");
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Couldn't load your closet. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchWardrobe();
    }
  }, [session, BACKEND_URL]);

  // --- 3-Day Cooldown Math ---
  const now = new Date();
  
  const availableItems = images.filter(item => {
    if (!item.last_worn_date) return true; // Never worn = Available
    const diffDays = (now.getTime() - new Date(item.last_worn_date).getTime()) / (1000 * 3600 * 24);
    return diffDays >= 5;
  });

  const laundryItems = images.filter(item => {
    if (!item.last_worn_date) return false;
    const diffDays = (now.getTime() - new Date(item.last_worn_date).getTime()) / (1000 * 3600 * 24);
    return diffDays < 5; // Worn recently = In the Wash
  });

  if (loading) return <div className="text-gray-500 mt-10">Loading your closet...</div>;
  if (error) return <div className="text-gray-500 mt-10">{error}</div>;
  if (images.length === 0) return <div className="text-gray-500 mt-10">Your closet is empty. Add some items!</div>;

  const displayItems = activeTab === "available" ? availableItems : laundryItems;

  return (
    <div className="mt-6">
      {/* Dropdown Menu Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Wardrobe</h2>
        <select 
          value={activeTab} 
          onChange={(e) => setActiveTab(e.target.value as "available" | "laundry")}
          className="bg-white z-10 cursor-pointer border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
        >
          <option value="available">Available ({availableItems.length})</option>
          <option value="laundry">In the Wash ({laundryItems.length})</option>
        </select>
      </div>

      {displayItems.length === 0 ? (
        <div className="text-gray-500 mt-10 italic">
          {activeTab === "available" ? "No clean clothes available!" : "Nothing in the laundry right now."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          {displayItems.map((item, index) => (
            <div key={index} className={`rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-white relative ${activeTab === 'laundry' ? 'opacity-60 grayscale' : ''}`}>
              <img
                src={item.image_url} 
                alt="Clothing item"
                className="w-full h-48 object-cover"
              />
              <div className="p-3 text-sm text-gray-700 font-medium border-t border-gray-100">
                Category: {item.category} 
              </div>
              
              {/* Red Timestamp overlay for laundry items */}
              {activeTab === 'laundry' && item.last_worn_date && (
                <div className="absolute top-0 left-0 w-full bg-red-500/90 text-white text-[10px] uppercase font-bold text-center py-1">
                  Worn: {new Date(item.last_worn_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}