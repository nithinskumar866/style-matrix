import { supabase } from "./src/lib/supabaseClient";

export async function uploadImageToSupabase(file:File, folder = 'user-clothing-images', filename='') {
  const imagesBucketName = import.meta.env.VITE_IMAGE_BUCKET_NAME
  const filepath = `${folder}/${crypto.randomUUID()}-${filename.length > 0? filename:file.name}`

  const {data, error} = await supabase.storage.from(imagesBucketName).upload(filepath, file, {upsert: false});

  if (error) throw error

  return supabase.storage.from(imagesBucketName).getPublicUrl(data.path).data.publicUrl;
}  