import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Read professors from Vercel Blob
    const professorsBlob = await fetch("https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/professors.json", {
      cache: 'no-store'
    });
    let professors = [];
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    // Find professor by ID
    const professorId = req.query.id || req.query.id;
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID required' });
    }
    
    const professor = professors.find(p => p.id === professorId);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    console.log(professor);
    if (req.method === 'GET') {
      // Load corpus from Vercel Blob
      const corpusBlob = await fetch(professor.corpus, {
        cache: 'no-store'
      });
      let corpus = null;
      if (corpusBlob && corpusBlob.text) {
        corpus = JSON.parse(await corpusBlob.text());
      }
      
      return res.status(200).json({
        ...professor,
        corpus
      });
    }
    
    if (req.method === 'PUT') {
      const { corpus } = req.body;
      // Save corpus to Vercel Blob
      await put(`corpora/${professorId}.json`, JSON.stringify(corpus, null, 2), { 
        access: 'public',
        cacheControlMaxAge: 0,
        cacheTtl: 0,
        addRandomSuffix: false
      });
      
      return res.status(200).json(professor);
    }
  } catch (err) {
    console.error('Error handling professor:', err);
    res.status(500).json({ error: 'Failed to process professor' });
  }
}
