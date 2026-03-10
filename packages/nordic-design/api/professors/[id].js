import { get, put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return getProfessor(req, res);
  }
  if (req.method === 'PUT') {
    return updateProfessor(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getProfessor(req, res) {
  try {
    const professorId = req.query.id;
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID required' });
    }
    
    const professorsBlob = await get('professors.json');
    let professors = [];
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    const professor = professors.find(p => p.id === professorId);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    const corpusBlob = await get(`corpora/${professorId}.json`);
    let corpus = null;
    if (corpusBlob && corpusBlob.text) {
      corpus = JSON.parse(await corpusBlob.text());
    }
    
    return res.status(200).json({
      ...professor,
      corpus
    });
  } catch (err) {
    console.error('Error fetching professor:', err);
    res.status(500).json({ error: 'Failed to fetch professor' });
  }
}

async function updateProfessor(req, res) {
  try {
    const professorId = req.query.id;
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID required' });
    }
    
    const body = await req.json();
    const { corpus } = body;
    
    await put(`corpora/${professorId}.json`, JSON.stringify(corpus, null, 2), { 
      access: 'public',
      cacheControl: 'no-cache'
    });
    
    return res.status(200).json({ id: professorId });
  } catch (err) {
    console.error('Error updating professor:', err);
    res.status(500).json({ error: 'Failed to update professor' });
  }
}
