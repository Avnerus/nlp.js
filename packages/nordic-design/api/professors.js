import { put, del } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listProfessors(req, res);
  }
  if (req.method === 'POST') {
    req.on('data', (chunk) => {
        // TODO: weird fix to get busboy to start processing
    });
    return createProfessor(req, res);
  }
  if (req.method === 'DELETE') {
    return deleteProfessor(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const fields = {};
    let imageFile = null;

    bb.on('field', (name, value) => {
      fields[name] = value;
    });

    bb.on('file', (name, file, { mimeType }) => {
      if (name === 'image' && mimeType.startsWith('image/')) {
        const chunks = [];
        file.on('data', (chunk) => chunks.push(chunk));
        file.on('end', () => {
          imageFile = {
            buffer: Buffer.concat(chunks),
            mimeType,
            name: `prof_${Date.now()}${path.extname(file.filename || '')}`,
          };
        });
      }
    });

    bb.on('close', () => {
      resolve({ fields, imageFile });
    });

    bb.on('error', reject);
    req.pipe(bb);
  });
}

async function listProfessors(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const professors = await sql`SELECT * FROM professors ORDER BY created_at DESC`;
    
    res.status(200).json(professors);
  } catch (err) {
    console.error('Error fetching professors:', err);
    res.status(500).json({ error: 'Failed to fetch professors' });
  }
}

async function createProfessor(req, res) {
  try {
    const { fields, imageFile } = await parseFormData(req);
    const name = fields.name || '';
    const field = fields.field || '';
    
    let imageUrl = 'https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/images/default.jpg';
    if (imageFile) {
      const { url } = await put(`images/professors/${imageFile.name}`, imageFile.buffer, { 
        access: 'public',
        cacheControlMaxAge: 31536000,
        cacheTtl: 31536000,
        addRandomSuffix: false
      });
      imageUrl = url;
    }
    
    // Load template corpus from blob
    const templateResponse = await fetch('https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/corpus-en.json', {
      cache: 'no-store'
    });
    
    if (!templateResponse.ok) {
      throw new Error('Failed to load template corpus');
    }
    
    const templateCorpus = await templateResponse.text();
    let corpusData;
    try {
      corpusData = JSON.parse(templateCorpus);
    } catch (e) {
      console.error('Failed to parse template corpus:', e);
      corpusData = { name: "Corpus", locale: "en-US", data: [] };
    }
    
    // Extract entities from template
    const entities = corpusData.entities || {};
    
    // Convert knowledge (data array) to YAML format
    const knowledge = convertDataToYaml(corpusData.data || []);
    
    // Create the corpus with entities and knowledge
    const baseCorpus = {
      name: corpusData.name || "Corpus",
      locale: corpusData.locale || "en-US"
    };
    
    if (Object.keys(entities).length > 0) {
      baseCorpus.entities = entities;
    }
    
    if (corpusData.data && corpusData.data.length > 0) {
      baseCorpus.data = corpusData.data;
    }
    
    // Insert professor into database with all fields as text
    const timestamp = new Date();
    const professor = await sql`
      INSERT INTO professors (name, field, image, knowledge, entities, corpus, created_at)
      VALUES (${name}, ${field}, ${imageUrl}, ${knowledge || ''}, ${JSON.stringify(entities) || null}, ${JSON.stringify(baseCorpus)}, ${timestamp})
      RETURNING id
    `;
    
    const newProfessor = {
      id: professor[0].id,
      name,
      field,
      image: imageUrl,
      knowledge,
      entities,
      corpus: baseCorpus,
      createdAt: timestamp
    };
    
    res.status(201).json(newProfessor);
  } catch (err) {
    console.error('Error creating professor:', err);
    res.status(500).json({ error: 'Failed to create professor' });
  }
}

// Convert data array to YAML format for knowledge field
function convertDataToYaml(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '';
  }
  
  return data.map(intent => {
    let yaml = `- intent: ${intent.intent}\n`;
    yaml += `  utterances:\n`;
    if (intent.utterances && intent.utterances.length > 0) {
      yaml += intent.utterances.map(utt => `    - ${utt}\n`).join('');
    }
    yaml += `  answers:\n`;
    if (intent.answers && intent.answers.length > 0) {
      yaml += intent.answers.map(ans => {
        // Handle both string and object answers
        if (typeof ans === 'string') {
          return `    - ${ans}\n`;
        } else if (ans && ans.answer) {
          return `    - ${ans.answer}\n`;
        }
        return '';
      }).join('');
    }
    return yaml;
  }).join('');
}

async function deleteProfessor(req, res) {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Professor ID is required' });
    }
    
    // Find the professor to delete
    const professor = await sql`SELECT * FROM professors WHERE id = ${Number(id)}`;
    if (professor.length === 0) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    const professorData = professor[0];
    
    // Delete the professor's image from blob if it's not the default
    if (professorData.image && !professorData.image.includes('default-professor.jpg')) {
      try {
        await del(professorData.image);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
    
    // Delete the professor from database
    await sql`DELETE FROM professors WHERE id = ${Number(id)}`;
    
    res.status(200).json({ success: true, message: 'Professor deleted successfully' });
  } catch (err) {
    console.error('Error deleting professor:', err);
    res.status(500).json({ error: 'Failed to delete professor' });
  }
}
