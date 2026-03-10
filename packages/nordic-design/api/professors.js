import { put } from '@vercel/blob';
import path from 'path';
import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const professorsBlob = await fetch("https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/professors.json");
    let professors = [];
    if (professorsBlob)  {
      professors = await professorsBlob.json()
    }
    
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
        cacheControl: 'public, max-age=31536000, immutable'
      });
      imageUrl = url;
    }
    
    const template = await (await fetch('https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/corpus-en.json')).text();
    const newId = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const corpusBlob = await put(`corpora/${newId}.json`, template, { 
      access: 'public',
      cacheControl: 'no-cache',
      addRandomSuffix: false,  // ← keeps the exact filename
    });
    const corpusUrl = corpusBlob.url;
    
    let professors = [];
    const professorsBlob = await fetch("https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/professors.json");
    if (professorsBlob && professorsBlob.ok) {
      professors = await professorsBlob.json();
    }
    
    const professor = {
      id: newId,
      name,
      field,
      image: imageUrl,
      corpus: corpusUrl,
      createdAt: new Date().toISOString()
    };
    
    professors.push(professor);
    
    await put('professors.json', JSON.stringify(professors, null, 2), { 
      access: 'public',
      cacheControl: 'no-cache',
      addRandomSuffix: false
    });
    
    res.status(201).json(professor);
  } catch (err) {
    console.error('Error creating professor:', err);
    res.status(500).json({ error: 'Failed to create professor' });
  }
}
