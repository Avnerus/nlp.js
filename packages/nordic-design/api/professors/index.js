import { get } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Read professors from Vercel Blob
    const professorsBlob = await get('professors.json');
    let professors = [];
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    res.status(200).json(professors);
  } catch (err) {
    console.error('Error fetching professors:', err);
    res.status(500).json({ error: 'Failed to fetch professors' });
  }
}
