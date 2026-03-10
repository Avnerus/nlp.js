const fs = require('fs').promises;
const path = require('path');

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const professorsFile = path.join(dataDir, 'professors.json');
    
    // Read professors
    let professors = [];
    try {
      const data = await fs.readFile(professorsFile, 'utf8');
      professors = JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
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
    
    if (req.method === 'GET') {
      // Load corpus
      const corpusPath = path.join(dataDir, 'corpora', `${professorId}.json`);
      let corpus = null;
      try {
        corpus = require(corpusPath);
      } catch (err) {
        // Corpus doesn't exist yet
      }
      
      return res.status(200).json({
        ...professor,
        corpus
      });
    }
    
    if (req.method === 'PUT') {
      const { corpus } = req.body;
      const corpusPath = path.join(dataDir, 'corpora', `${professorId}.json`);
      await fs.writeFile(corpusPath, JSON.stringify(corpus, null, 2));
      
      return res.status(200).json(professor);
    }
  } catch (err) {
    console.error('Error handling professor:', err);
    res.status(500).json({ error: 'Failed to process professor' });
  }
}
