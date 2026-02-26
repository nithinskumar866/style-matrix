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






import { useEffect, useState } from "react";

export default function Wardrobe() {
  const [images, setImages] = useState<any[]>([]);

  
  useEffect(() => {
    fetch("http://127.0.0.1:8000/items")
      .then((res) => res.json())
      .then((data) => {
        setImages(data);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4">
      {images.map((item, index) => (
        <div key={index} className="border p-2 rounded">
          <img
            src={item.image_url}
            alt="clothing"
            className="w-full h-40 object-cover rounded"
          />
          <p className="text-sm mt-2 text-center">
            Category: {item.category}
          </p>
        </div>
      ))}
    </div>
  );
}