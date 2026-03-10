import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const blob = await put('professors.json', JSON.stringify([]), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,  // ← keeps the exact filename
    });
    res.status(200).json(JSON.stringify(blob.url));
  }
}
