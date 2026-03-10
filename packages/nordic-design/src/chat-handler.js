import { createNlp } from './nlp-engine.js';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function processChat(professorId, message, locale = 'en') {
  const dataDir = path.join(__dirname, '..', 'data');
  const professorsFile = path.join(dataDir, 'professors.json');
  
  // Read professors index
  let professors = [];
  try {
    const data = await readFile(professorsFile, 'utf8');
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
  const corpusPath = path.join(dataDir, 'corpora', `${professorId}.json`);
  let nlp;
  try {
    nlp = await createNlp(corpusPath, locale);
  } catch (err) {
    // Fallback to default corpus if custom corpus fails
    console.warn(`Failed to load custom corpus for ${professorId}, using default`);
    const templatePath = path.join(__dirname, '..', 'corpus-en.json');
    nlp = await createNlp(templatePath, locale);
  }
  
  // Process message
  const response = await nlp.process(locale, message);
  
  return {
    professor,
    response
  };
}
