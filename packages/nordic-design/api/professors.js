import { put, get } from '@vercel/blob';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const formData = await req.formData();
    const name = formData.get('name');
    const field = formData.get('field');
    const imageFile = formData.get('image');
    
    // Upload image if provided
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
    
    // Create corpus from template
    const templatePath = path.join(__dirname, '..', 'corpus-en.json');
    const template = require(templatePath);
    const newId = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Upload corpus to Blob
    await put(`corpora/${newId}.json`, JSON.stringify(template, null, 2), { 
      access: 'public',
      cacheControl: 'no-cache'
    });
    
    // Initialize professors list
    let professors = [];
    const professorsBlob = await get('professors.json');
    if (professorsBlob && professorsBlob.text) {
      professors = JSON.parse(await professorsBlob.text());
    }
    
    // Create professor entry
    const professor = {
      id: newId,
      name,
      field,
      image: imageUrl,
      corpus: `corpora/${newId}.json`,
      createdAt: new Date().toISOString()
    };
    
    professors.push(professor);
    
    // Save updated professors list to Blob
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
