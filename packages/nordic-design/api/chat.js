import { createNlp } from '../src/nlp-engine.js';

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
    const { professorId, message, context, locale = 'en' } = req.body;
    
    if (!professorId || !message) {
      return res.status(400).json({ error: 'professorId and message are required' });
    }
    
    // Read professors list
    const professorsBlob = await fetch('https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/professors.json');
    let professors = [];
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    // Find professor
    const professor = professors.find(p => p.id === professorId);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    // Load NLP
    const nlp = await createNlp(professor.corpus, locale);
    const response = await nlp.process(locale, message, context);
    
    res.status(200).json({answer: response.answer, context});
  } catch (err) {
    console.error('Error processing chat:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
}
