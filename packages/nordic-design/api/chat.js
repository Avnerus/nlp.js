import { neon } from '@neondatabase/serverless';
import { createNlp } from '../src/nlp-engine.js';
import yaml from 'js-yaml';


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

    const sql = neon(process.env.DATABASE_URL_UNPOOLED);
    const { professorId, message, context, locale = 'en' } = req.body;

    if (!professorId || !message) {
      return res
        .status(400)
        .json({ error: 'professorId and message are required' });
    }

    // Read professor from database
    const professor = await sql`SELECT * FROM professors WHERE id = ${Number(
      professorId
    )}`;
    if (professor.length === 0) {
      return res.status(404).json({ error: 'Professor not found' });
    }

    const professorData = professor[0];
    const corpusObj = {
      name: 'Corpus',
      locale: 'en-US',
    };
    corpusObj.data = yaml.load(professorData.knowledge);
    corpusObj.entities = JSON.parse(professorData.entities);

    // Load NLP with corpus from database
    const nlp = await createNlp(corpusObj, locale);
    const response = await nlp.process(locale, message, context);

    res.status(200).json({ answer: response.answer, context });
  } catch (err) {
    console.error('Error processing chat:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
}
