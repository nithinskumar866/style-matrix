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


import { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";

export default function Wardrobe() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { BACKEND_URL, session } = useAppContext();

  useEffect(() => {
    const fetchWardrobe = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/wardrobe/items`, {
          headers: {
            "Authorization": `Bearer ${session?.access_token}`
          }
        });
        
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setImages(data || []); // Adjust based on your FastAPI return schema
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchWardrobe();
    }
  }, [session, BACKEND_URL]);

  if (loading) return <div className="text-gray-500 mt-10">Loading your closet...</div>;
  if (images.length === 0) return <div className="text-gray-500 mt-10">Your closet is empty. Add some items!</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
      {images.map((item, index) => (
        <div key={index} className="rounded-lg overflow-hidden shadow-sm border border-gray-200 bg-white">
          <img
            src={item.url} // Using the direct Supabase URL
            alt="Clothing item"
            className="w-full h-48 object-cover"
          />
          <div className="p-3 text-sm text-gray-700 font-medium">
             {/* Replace with your ResNet category label mapping if needed */}
            Category: {item.category} 
          </div>
        </div>
      ))}
    </div>
  );
}