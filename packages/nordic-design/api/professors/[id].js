import { neon } from '@neondatabase/serverless';
import yaml from 'js-yaml';


export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED);
    // Read professor from database
    const professorId = req.query.id || req.query.id;
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID required' });
    }

    const professor = await sql`SELECT * FROM professors WHERE id = ${Number(
      professorId
    )}`;
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
        knowledge: professorData.knowledge || '',
        entities: professorData.entities
          ? JSON.parse(professorData.entities)
          : {},
        createdAt: professorData.created_at,
      });
      return;
    }

    if (req.method === 'PUT') {
      const { knowledge, entities } = req.body;

      // Update corpus in database as JSON string
      await sql`
        UPDATE professors 
        SET knowledge = ${knowledge || null}, 
            entities = ${entities ? JSON.stringify(entities) : null}
        WHERE id = ${Number(professorId)}
      `;

      res.status(200).json({
        id: professorData.id,
        name: professorData.name,
        field: professorData.field,
        image: professorData.image,
        knowledge,
        entities: entities || {},
        createdAt: professorData.created_at,
      });
      return;
    }
  } catch (err) {
    console.error('Error handling professor:', err);
    res.status(500).json({ error: 'Failed to process professor' });
  }
}
