import { put } from '@vercel/blob';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    
    if (!file || !(file instanceof File)) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Read file as arrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate unique filename
    const ext = path.extname(file.name).toLowerCase();
    const safeName = `prof_${Date.now()}${ext}`;
    
    // Upload to Vercel Blob
    const { url } = await put(`images/professors/${safeName}`, buffer, { 
      access: 'public',
      cacheControl: 'public, max-age=31536000, immutable'
    });
    
    res.status(200).json({ url });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}
