import { get, put } from '@vercel/blob';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listProfessors(req, res);
  }
  if (req.method === 'POST') {
    return createProfessor(req, res);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listProfessors(req, res) {
  try {
    const professorsBlob = await get('professors.json');
    let professors = [];
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    res.status(200).json(professors);
  } catch (err) {
    console.error('Error fetching professors:', err);
    res.status(500).json({ error: 'Failed to fetch professors' });
  }
}

async function createProfessor(req, res) {
  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const field = formData.get('field');
    const imageFile = formData.get('image');
    
    let imageUrl = '/images/default-professor.jpg';
    if (imageFile && imageFile instanceof File) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const ext = path.extname(imageFile.name).toLowerCase();
      const safeName = `prof_${Date.now()}${ext}`;
      const { url } = await put(`images/professors/${safeName}`, Buffer.from(arrayBuffer), { 
        access: 'public',
        cacheControl: 'public, max-age=31536000, immutable'
      });
      imageUrl = url;
    }
    
    const templatePath = path.join(__dirname, '..', 'corpus-en.json');
    const template = await import(templatePath);
    const newId = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await put(`corpora/${newId}.json`, JSON.stringify(template, null, 2), { 
      access: 'public',
      cacheControl: 'no-cache'
    });
    
    let professors = [];
    const professorsBlob = await get('professors.json');
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    const professor = {
      id: newId,
      name,
      field,
      image: imageUrl,
      corpus: `corpora/${newId}.json`,
      createdAt: new Date().toISOString()
    };
    
    professors.push(professor);
    
    await put('professors.json', JSON.stringify(professors, null, 2), { 
      access: 'public',
      cacheControl: 'no-cache'
    });
    
    res.status(201).json(professor);
  } catch (err) {
    console.error('Error creating professor:', err);
    res.status(500).json({ error: 'Failed to create professor' });
  }
}
