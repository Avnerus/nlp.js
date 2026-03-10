const fs = require('fs').promises;
const path = require('path');
const busboy = require('busboy');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const bb = busboy({ headers: req.headers });
    const uploadDir = path.join(__dirname, '..', 'public', 'images', 'professors');
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    let filePath;
    
    bb.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (fieldname !== 'image') return;
      
      const ext = path.extname(filename).toLowerCase();
      const safeName = `prof_${Date.now()}${ext}`;
      filePath = path.join(uploadDir, safeName);
      
      file.pipe(fs.createWriteStream(filePath));
    });
    
    bb.on('close', async () => {
      if (filePath) {
        res.status(200).json({ 
          url: `/images/professors/${path.basename(filePath)}` 
        });
      } else {
        res.status(400).json({ error: 'No image uploaded' });
      }
    });
    
    req.on('data', (chunk) => bb.write(chunk));
    req.on('end', () => bb.end());
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
}
