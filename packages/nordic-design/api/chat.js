import { get } from '@vercel/blob';
import path from 'path';

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
    const body = await req.json();
    const { professorId, message, locale = 'en' } = body;
    
    if (!professorId || !message) {
      return res.status(400).json({ error: 'professorId and message are required' });
    }
    
    // Read professors list
    const professorsBlob = await get('professors.json');
    let professors = [];
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    // Find professor
    const professor = professors.find(p => p.id === professorId);
    if (!professor) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    // Load corpus from Blob
    const corpusBlob = await get(`corpora/${professorId}.json`);
    let corpus = null;
    if (corpusBlob && corpusBlob.text) {
      corpus = JSON.parse(await corpusBlob.text());
    }
    
    if (!corpus) {
      return res.status(404).json({ error: 'Corpus not found' });
    }
    
    // Load NLP
    const { createNlp } = await import('../src/nlp-engine.js');
    const nlp = await createNlp(corpus, locale);
    
    const response = await nlp.process(locale, message);
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Error processing chat:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
}
