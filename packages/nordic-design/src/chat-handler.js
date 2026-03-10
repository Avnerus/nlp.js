const { createNlp } = require('../src/nlp-engine');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

// Enable CORS for all origins (Vercel serverless function)
const corsMiddleware = cors();

async function processChat(professorId, message, locale = 'en') {
  const dataDir = path.join(__dirname, '..', 'data');
  const professorsFile = path.join(dataDir, 'professors.json');
  
  // Read professors index
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
    throw new Error(`Professor not found: ${professorId}`);
  }
  
  // Load corpus
  const corpusPath = path.join(__dirname, '..', 'data', 'corpora', `${professorId}.json`);
  let nlp;
  try {
    nlp = await createNlp(corpusPath, locale);
  } catch (err) {
    // Fallback to default corpus if custom corpus fails
    console.warn(`Failed to load custom corpus for ${professorId}, using default`);
    nlp = await createNlp(path.join(__dirname, '..', 'corpus-en.json'), locale);
  }
  
  // Process message
  const response = await nlp.process(locale, message);
  
  return {
    professor,
    response
  };
}

module.exports = { processChat };
