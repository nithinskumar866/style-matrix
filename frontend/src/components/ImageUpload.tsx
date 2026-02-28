import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileImage, X, Loader2 } from "lucide-react";

export default function ImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready for your new items.");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { BACKEND_URL, session } = useAppContext();

  // --- 1. Safe File Handling ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // --- 2. Safe Drag and Drop (TypeScript fixed) ---
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      // Only accept image files
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  // --- 3. Backend Integration ---
  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return alert("Please select an image first.");
    
    setLoading(true);
    setStatus("Uploading to your digital closet...");
    const imageUrls: string[] = [];

    try {
      // Step A: Upload to Supabase Storage
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("clothing-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("clothing-images").getPublicUrl(fileName);
        imageUrls.push(data.publicUrl);
      }

      setStatus("AI is analyzing category and style...");

      // Step B: Send to FastAPI Double Engine
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/add-clothing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(imageUrls), 
      });

      if (!response.ok) throw new Error("AI Processing Failed");

      setStatus("Successfully added to your wardrobe!");
      setSelectedFiles([]); // Clear out the list
      
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. The Elite UI ---
  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl rounded-none border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-serif tracking-wide text-zinc-900 dark:text-zinc-100">DIGITIZE WARDROBE</h2>
        <p className="text-xs uppercase tracking-widest text-zinc-500 mt-2">{status}</p>
      </div>

      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed cursor-pointer transition-all duration-300 ease-in-out ${
          isDragging 
            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100/50 dark:bg-zinc-900/50" 
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
        }`}
      >
        <UploadCloud className={`w-10 h-10 mb-4 transition-colors ${isDragging ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`} />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {isDragging ? "Drop images here" : "Click or drag images to upload"}
        </p>
        <p className="text-xs text-zinc-400 mt-2">JPG, PNG, HEIC</p>
      </div>

      {/* Selected Files List with Framer Motion */}
      <div className="mt-6 space-y-2">
        <AnimatePresence>
          {selectedFiles.map((file, index) => (
            <motion.div
              key={`${file.name}-${index}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center justify-between bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-md p-3 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <FileImage className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-50">
                  {file.name}
                </span>
              </div>
              <button 
                onClick={() => removeFile(index)} 
                disabled={loading} 
                className="p-1 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Upload Button */}
      <div className="mt-8">
        <button
          onClick={handleSubmit}
          disabled={loading || selectedFiles.length === 0}
          className="w-full flex items-center justify-center py-4 px-6 text-xs uppercase tracking-widest font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Upload & Analyze (${selectedFiles.length})`
          )}
        </button>
      </div>
    </div>
  );
}