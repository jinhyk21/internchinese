import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const BUCKET = 'media'

export async function uploadMedia(path, blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: blob.type })
  if (error) throw error
  return path
}

// Trả URL phát được: ưu tiên signed URL (bucket private), nếu không được thì public URL.
export async function mediaUrl(path) {
  if (!path) return null
  if (/^(https?:|data:)/.test(path)) return path
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl || supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function useMediaUrl(path) {
  const [url, setUrl] = useState(null)
  useEffect(() => { let on = true; mediaUrl(path).then(u => on && setUrl(u)); return () => { on = false } }, [path])
  return url
}
