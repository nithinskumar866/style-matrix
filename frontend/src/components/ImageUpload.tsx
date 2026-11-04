import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-states";
import { useToast } from "@/context/ToastContext";
import { useApi } from "@/hooks/useApi";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert, Loader2, UploadCloud, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { uploadImageToSupabase } from "../../helper";

type EntryStatus = "ready" | "cleaning" | "uploading" | "analyzing" | "done" | "failed";

interface UploadEntry {
  id: string;
  file: File;
  previewUrl: string;
  status: EntryStatus;
}

const STATUS_TEXT: Record<EntryStatus, string> = {
  ready: "Ready",
  cleaning: "Removing background...",
  uploading: "Uploading...",
  analyzing: "Analysing category and style...",
  done: "Added to your wardrobe",
  failed: "Couldn't be added",
};

export default function ImageUpload() {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entriesRef = useRef(entries);

  const { apiFetch, apiJson } = useApi();
  const { showToast } = useToast();

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Free the preview images when leaving the page
  useEffect(() => () => {
    entriesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
  }, []);

  const addFiles = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    setEntries((current) => [
      ...current,
      ...images.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "ready" as const,
      })),
    ]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    // Lets the same file be chosen again after removing it
    e.target.value = "";
  };

  const removeEntry = (id: string) => {
    setEntries((current) => {
      const entry = current.find((candidate) => candidate.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return current.filter((candidate) => candidate.id !== id);
    });
  };

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
    addFiles(Array.from(e.dataTransfer.files));
  };

  const setStatus = (id: string, status: EntryStatus) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, status } : entry)));
  };

  const withoutBackground = async (file: File) => {
    try {
      const response = await apiFetch("/wardrobe/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
      });
      const baseName = file.name.replace(/\.[^.]+$/, "");
      return { file: new File([await response.blob()], `${baseName}.png`, { type: "image/png" }), cleaned: true };
    } catch (error) {
      // A photo with its background is still better than no item at all
      console.error(error);
      return { file, cleaned: false };
    }
  };

  const handleSubmit = async () => {
    const pending = entries.filter((entry) => entry.status === "ready" || entry.status === "failed");
    setLoading(true);
    let added = 0;
    let keptBackground = 0;

    // One at a time, so that progress is visible and one bad photo can't sink the rest
    for (const entry of pending) {
      try {
        let file = entry.file;
        if (removeBackground) {
          setStatus(entry.id, "cleaning");
          const result = await withoutBackground(file);
          file = result.file;
          if (!result.cleaned) keptBackground += 1;
        }

        setStatus(entry.id, "uploading");
        const url = await uploadImageToSupabase(file, "clothing-items");

        setStatus(entry.id, "analyzing");
        await apiJson("/wardrobe/add-clothing", "POST", { imageUrls: [url] });

        setStatus(entry.id, "done");
        added += 1;
      } catch (error) {
        console.error(error);
        setStatus(entry.id, "failed");
      }
    }

    setLoading(false);
    const failed = pending.length - added;
    if (failed > 0) {
      showToast(`Added ${added} of ${pending.length}. You can retry the ones that failed.`, { isError: true });
    } else {
      showToast(`Added ${added} ${added === 1 ? "item" : "items"} to your wardrobe.`);
    }
    if (keptBackground > 0) {
      showToast(`The background couldn't be removed from ${keptBackground} ${keptBackground === 1 ? "photo" : "photos"}, so the original was used.`);
    }
  };

  const pendingCount = entries.filter((entry) => entry.status === "ready" || entry.status === "failed").length;

  return (
    <div className="w-full max-w-2xl pb-8">
      <PageHeader title="Add Clothes" description="We'll sort each photo into the right category for you." />

      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        className={`flex flex-col items-center justify-center w-full h-44 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
          isDragging ? "border-indigo-400 bg-accent" : "border-border bg-card hover:border-indigo-400"
        }`}
      >
        <UploadCloud className="w-9 h-9 mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">{isDragging ? "Drop images here" : "Click or drag images to upload"}</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP</p>
      </div>

      <label className="flex items-start gap-3 mt-4 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={removeBackground}
          disabled={loading}
          onChange={(e) => setRemoveBackground(e.target.checked)}
          className="mt-0.5 size-4 accent-indigo-500"
        />
        <span>
          Remove backgrounds
          <span className="block text-xs text-muted-foreground">Clean photos look better and match more accurately. Adds a few seconds per photo.</span>
        </span>
      </label>

      <div className="mt-5 space-y-2">
        <AnimatePresence>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 rounded-xl border bg-card p-2"
            >
              <img src={entry.previewUrl} alt="" className="w-14 h-14 rounded-lg bg-zinc-200 object-contain shrink-0" />
              <div className="min-w-0 grow">
                <p className="text-sm font-medium truncate">{entry.file.name}</p>
                <p className={`text-xs flex items-center gap-1 ${entry.status === "failed" ? "text-red-400" : "text-muted-foreground"}`}>
                  {entry.status === "done" && <Check className="w-3 h-3" />}
                  {entry.status === "failed" && <CircleAlert className="w-3 h-3" />}
                  {["cleaning", "uploading", "analyzing"].includes(entry.status) && <Loader2 className="w-3 h-3 animate-spin" />}
                  {STATUS_TEXT[entry.status]}
                </p>
              </div>
              <button
                onClick={() => removeEntry(entry.id)}
                disabled={loading}
                aria-label={`Remove ${entry.file.name}`}
                className="p-2 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button size="lg" onClick={handleSubmit} disabled={loading || pendingCount === 0} className="w-full h-12 mt-5">
        {loading ? <><Loader2 className="animate-spin" /> Processing...</> : `Upload & Analyse (${pendingCount})`}
      </Button>
    </div>
  );
}
