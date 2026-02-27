import { useState, useRef, DragEvent } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAppContext } from "@/context/AppContext";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, FileImage, X } from "lucide-react";

export default function ImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready for your new items.");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { BACKEND_URL, session } = useAppContext();

  // --- Event Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };
  
  const handleSelectImages = () => fileInputRef.current?.click();

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault(); // Necessary for onDrop to fire

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };
  
  const addFiles = (files: File[]) => {
    // Optionally filter for image types
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setSelectedFiles(prevFiles => [...prevFiles, ...imageFiles]);
    setStatus(`${imageFiles.length} image(s) selected.`);
  };

      // Upload to Supabase Storage
      
      const imageUrl = await uploadImageToSupabase(file , "clothingImages");
        //console.log(imageUrl);
        imageUrls.push(imageUrl)


  // --- Submit Logic ---
  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return setStatus("Please select an image first.");
    
    setLoading(true);
    const totalFiles = selectedFiles.length;
    const imageUrls: string[] = [];
    
    try {
      for (const [index, file] of selectedFiles.entries()) {
        setStatus(`Uploading ${index + 1} of ${totalFiles}...`);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${session?.user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from("clothing-images").upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("clothing-images").getPublicUrl(fileName);
        imageUrls.push(data.publicUrl);
      }

      setStatus("AI is analyzing your items...");
      const response = await fetch(`${BACKEND_URL}/api/wardrobe/add-clothing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(imageUrls),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "AI processing failed.");
      }

      setStatus(`Success! ${totalFiles} new item(s) added to your wardrobe.`);
      setSelectedFiles([]);
      
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Dropzone */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleSelectImages}
        className={`relative flex flex-col items-center justify-center p-12 rounded-2xl cursor-pointer
                    bg-black/30 backdrop-blur-xl border-2 border-dashed border-white/20
                    transition-all duration-300 ease-in-out
                    ${isDragging ? 'border-solid border-indigo-400 scale-105 bg-indigo-950/40' : ''}`}
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
        <UploadCloud className={`w-16 h-16 text-gray-400 transition-transform duration-300 ${isDragging ? 'scale-110' : ''}`} />
        <p className="mt-4 text-lg font-semibold text-white">Drag & Drop Your Images</p>
        <p className="text-sm text-gray-400">or click to select files</p>
        <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </motion.div>

      {/* Uploads and Status Section */}
      {(selectedFiles.length > 0 || loading) && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Upload Queue ({selectedFiles.length})</h3>
            <p className={`text-sm font-medium ${status.includes('Error') ? 'text-red-400' : 'text-gray-300'}`}>{status}</p>
          </div>
          
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            <AnimatePresence>
              {selectedFiles.map((file) => (
                <motion.div
                  key={file.name}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between bg-white/5 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileImage className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-200 truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeFile(file.name)} disabled={loading} className="p-1 rounded-full text-gray-500 hover:text-white hover:bg-white/10 disabled:opacity-50">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10">
            <button
              onClick={handleSubmit}
              disabled={loading || selectedFiles.length === 0}
              className="w-full py-3 px-6 rounded-lg text-sm font-semibold text-white bg-indigo-600 
                         hover:bg-indigo-500 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed
                         transition-all duration-300"
            >
              {loading ? 'Processing...' : `Upload & Analyze ${selectedFiles.length} Item(s)`}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
