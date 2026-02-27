// import { useState } from "react";

// export default function ImageUpload() {
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       setSelectedFile(e.target.files[0]); // Only store, not upload
//     }
//   };

//   const handleSubmit = async () => {
//     if (!selectedFile) {
//       alert("Please select an image first");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       await fetch("http://localhost:8000/upload", {
//         method: "POST",
//         body: formData,
//       });

//       alert("Image uploaded successfully!");
//     } catch (error) {
//       console.error(error);
//       alert("Upload failed");
//     }
//   };

//   return (
//     <div>
//       <h2>Upload Image</h2>
//       <input type="file" onChange={handleFileChange} />
//       <button onClick={handleSubmit}>Submit</button>
//     </div>
//   );
// }




// import { useState } from "react";

// export default function ImageUpload() {
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   // Only store file
//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       setSelectedFile(e.target.files[0]);
//     }
//   };

//   // Upload only on Submit
//   const handleSubmit = async () => {
//     alert("submited click");
//     if (!selectedFile) {
//       alert("Please select image first");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       const response = await fetch("http://localhost:8000/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const data = await response.json();
//       alert(data.message);
//     } catch (error) {
//       console.error(error);
//       alert("Upload failed");
//     }
//   };

//   return (
//     <div>
//       <input type="file" onChange={handleFileChange} />
//       <button
//         onClick={handleSubmit}
//         className="ml-3 px-4 py-2 bg-green-500 text-white rounded"
//       >
//         Submit
//       </button>
//     </div>
//   );
// }





import { useAppContext } from "@/context/AppContext";
import { useRef, useState } from "react";
import { uploadImageToSupabase } from "../../helper";


export default function ImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {BACKEND_URL,session} = useAppContext();
  const handleSelectImages = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select images first");
      return;
    }
let imageUrls : String [] =[];
    for (const file of selectedFiles) {

      // 1️⃣ Upload to Supabase Storage
      
      const imageUrl = await uploadImageToSupabase(file , "clothingImages");
        //console.log(imageUrl);
        imageUrls.push(imageUrl)

      // 3️⃣ Send URL to Backend
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/add-clothing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
         imageUrls : imageUrls,
        }),
      });

    }

    // alert("Images uploaded successfully");
    setSelectedFiles([]);
  };

  return (
    <div className="flex flex-col items-center">
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={handleSelectImages}
        className="px-8 py-3 bg-black text-white"
      >
        SELECT IMAGES
      </button>

      {selectedFiles.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedFiles.map((file, index) => (
            <p key={index}>{file.name}</p>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        className="mt-6 px-8 py-3 border border-black"
      >
        SUBMIT
      </button>
    </div>
  );
}