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
    const { professorId, message, locale = 'en' } = req.body;
    
    if (!professorId || !message) {
      return res.status(400).json({ error: 'professorId and message are required' });
    }
    
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
    
    // Find professor
    const professor = professors.find(p => p.id === professorId);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    // Load corpus
    const corpusPath = path.join(dataDir, 'corpora', `${professorId}.json`);
    
    // Load NLP
    const { dockStart } = require('@nlpjs/basic');
    const dock = await dockStart();
    const nlp = dock.get('nlp');
    
    // Load corpus file and add intents
    const corpus = require(corpusPath);
    for (const item of corpus.data) {
      const { intent, utterances, answers } = item;
      
      for (const utterance of utterances) {
        nlp.addDocument(locale, utterance, intent);
      }
      
      if (Array.isArray(answers)) {
        for (const answerObj of answers) {
          const answer = typeof answerObj === 'string' ? answerObj : answerObj.answer;
          nlp.addAnswer(locale, intent, answer);
        }
      }
    }
    
    await nlp.train();
    const response = await nlp.process(locale, message);
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Error processing chat:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
}
