const fs = require('fs').promises;
const path = require('path');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const corporaDir = path.join(dataDir, 'corpora');
    const professorsFile = path.join(dataDir, 'professors.json');
    
    // Create directories
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(corporaDir, { recursive: true });
    
    // Initialize professors file
    try {
      await fs.access(professorsFile);
    } catch (err) {
      if (err.code === 'ENOENT') {
        await fs.writeFile(professorsFile, JSON.stringify([], null, 2));
      } else {
        throw err;
      }
    }
    
    // Read existing professors
    let professors = [];
    try {
      const data = await fs.readFile(professorsFile, 'utf8');
      professors = JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    
    // Generate new professor ID
    const newId = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { name, field, image } = req.body;
    
    // Create corpus from template
    const templatePath = path.join(__dirname, '..', 'corpus-en.json');
    const template = require(templatePath);
    
    const corpusPath = path.join(corporaDir, `${newId}.json`);
    await fs.writeFile(corpusPath, JSON.stringify(template, null, 2));
    
    // Create professor entry
    const professor = {
      id: newId,
      name,
      field,
      image: image || '/images/default-professor.jpg',
      corpus: `corpora/${newId}.json`,
      createdAt: new Date().toISOString()
    };
    
    professors.push(professor);
    await fs.writeFile(professorsFile, JSON.stringify(professors, null, 2));
    
    res.status(201).json(professor);
  } catch (err) {
    console.error('Error creating professor:', err);
    res.status(500).json({ error: 'Failed to create professor' });
  }
}
