const fs = require('fs').promises;
const path = require('path');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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
    
    res.status(200).json(professors);
  } catch (err) {
    console.error('Error fetching professors:', err);
    res.status(500).json({ error: 'Failed to fetch professors' });
  }
}
