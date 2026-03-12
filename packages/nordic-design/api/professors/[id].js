import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Read professor from database
    const professorId = req.query.id || req.query.id;
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID required' });
    }
    
    const professor = await sql`SELECT * FROM professors WHERE id = ${Number(professorId)}`;
    if (professor.length === 0) {
      return res.status(404).json({ error: 'Professor not found' });
    }
    
    const professorData = professor[0];
    
    if (req.method === 'GET') {
      res.status(200).json({
        id: professorData.id,
        name: professorData.name,
        field: professorData.field,
        image: professorData.image,
        corpus: JSON.parse(professorData.corpus),
        createdAt: professorData.created_at
      });
      return;
    }
    
    if (req.method === 'PUT') {
      const { corpus } = req.body;
      
      // Update corpus in database
      await sql`
        UPDATE professors 
        SET corpus = ${JSON.stringify(corpus)} 
        WHERE id = ${Number(professorId)}
      `;
      
      res.status(200).json({
        id: professorData.id,
        name: professorData.name,
        field: professorData.field,
        image: professorData.image,
        corpus: corpus,
        createdAt: professorData.created_at
      });
      return;
    }
  } catch (err) {
    console.error('Error handling professor:', err);
    res.status(500).json({ error: 'Failed to process professor' });
  }
}
