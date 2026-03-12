import { put } from '@vercel/blob';
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

    req.resume();
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
    
    let imageUrl = 'https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/images/professors/default-professor.jpg';
    if (imageFile) {
      const { url } = await put(`images/professors/${imageFile.name}`, imageFile.buffer, { 
        access: 'public',
        cacheControlMaxAge: 31536000,
        cacheTtl: 31536000,
        addRandomSuffix: false
      });
      imageUrl = url;
    }
    
    const template = await (await fetch('https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/corpus-en.json', {
      cache: 'no-store'
    })).text();
    const newId = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse the template to JSON to store in database
    let corpus = {};
    try {
      corpus = JSON.parse(template);
    } catch (e) {
      console.error('Failed to parse template:', e);
    }
    
    // Insert professor into database with corpus as JSON
    await sql`
      INSERT INTO professors (name, field, image, corpus, created_at)
      VALUES (${name}, ${field}, ${imageUrl}, ${JSON.stringify(corpus)}, ${new Date()})
    `;
    
    const professor = {
      id: newId,
      name,
      field,
      image: imageUrl,
      corpus, // Return the corpus object
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json(professor);
  } catch (err) {
    console.error('Error creating professor:', err);
    res.status(500).json({ error: 'Failed to create professor' });
  }
}

async function deleteProfessor(req, res) {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Professor ID is required' });
    }
    
    // Find the professor to delete
    const professor = await sql`SELECT * FROM professors WHERE id = ${id}`;
    if (professor.length === 0) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    const professorData = professor[0];
    
    // Delete the professor's image from blob if it's not the default
    if (professorData.image && !professorData.image.includes('default-professor.jpg')) {
      try {
        // Extract the path from the blob URL
        const imagePath = professorData.image.replace('https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/', '');
        await put(imagePath, null, { 
          access: 'public',
          cacheControlMaxAge: 0,
          cacheTtl: 0
        });
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
    
    // Delete the professor from database
    await sql`DELETE FROM professors WHERE id = ${id}`;
    
    res.status(200).json({ success: true, message: 'Professor deleted successfully' });
  } catch (err) {
    console.error('Error deleting professor:', err);
    res.status(500).json({ error: 'Failed to delete professor' });
  }
}
