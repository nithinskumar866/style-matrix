import { supabase } from "./src/lib/supabaseClient";

export async function uploadImageToSupabase(file:File, folder = 'user-clothing-images', filename='') {
  const imagesBucketName = import.meta.env.VITE_IMAGE_BUCKET_NAME
  const filepath = `${folder}/${crypto.randomUUID()}-${filename.length > 0? filename:file.name}`

  const {data, error} = await supabase.storage.from(imagesBucketName).upload(filepath, file, {upsert: false});

  if (error) throw error

  return supabase.storage.from(imagesBucketName).getPublicUrl(data.path).data.publicUrl;
}

// Best effort: the wardrobe entry is already gone, so a leftover file does no harm
export async function deleteImageFromSupabase(imageUrl: string) {
  const imagesBucketName = import.meta.env.VITE_IMAGE_BUCKET_NAME
  const marker = `/object/public/${imagesBucketName}/`
  const start = imageUrl.indexOf(marker)
  if (start === -1) return

  const path = decodeURIComponent(imageUrl.slice(start + marker.length))
  const { error } = await supabase.storage.from(imagesBucketName).remove([path])
  if (error) console.warn("Couldn't remove the image file:", error.message)
}
