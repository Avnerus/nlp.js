import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API Tests', () => {
  // Note: These tests require a running development server
  // Run with: npx vercel dev (in a separate terminal) then npm test
  // The server should be running on http://localhost:3000
  // NOTE: Tests use a single professor that is cleaned up at the end
  // Do NOT use api/init to avoid clearing production database

  const BASE_URL = 'http://localhost:3000';
  let testProfessorId = null;

  beforeAll(async () => {
    // Create a single test professor at the start
    const formData = new FormData();
    formData.append('name', 'Test Professor');
    formData.append('field', 'Industrial & Product Design');

    const response = await fetch(`${BASE_URL}/api/professors`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const professor = await response.json();
      testProfessorId = professor.id;
    }
  }, 20000);

  afterAll(async () => {
    // Cleanup: delete the test professor if it exists
    if (testProfessorId) {
      try {
        await fetch(`${BASE_URL}/api/professors`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: testProfessorId }),
        });
      } catch (err) {
        console.log(`Cleanup: Could not delete professor ${testProfessorId}`, err);
      }
    }
  }, 10000);

  it('should list professors', async () => {
    const response = await fetch(`${BASE_URL}/api/professors`);
    expect(response.status).toBe(200);

    const professors = await response.json();
    expect(Array.isArray(professors)).toBe(true);
  }, 10000);

  it('should get professor by ID', async () => {
    if (!testProfessorId) {
      console.log('Skipping: no test professor ID available');
      return;
    }

    const response = await fetch(`${BASE_URL}/api/professors/${testProfessorId}`);
    expect(response.status).toBe(200);

    const professor = await response.json();
    expect(professor.id).toBe(testProfessorId);
    expect(professor.name).toBe('Test Professor');
  }, 15000);

  it('should update professor knowledge and entities', async () => {
    if (!testProfessorId) {
      console.log('Skipping: no test professor ID available');
      return;
    }

    const updatedKnowledge = `- intent: greetings.hello
  utterances:
    - hello
    - hi
  answers:
    - Hello there!
`;

    const entities = { username: { trim: [] } };

    const response = await fetch(`${BASE_URL}/api/professors/${testProfessorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        knowledge: updatedKnowledge,
        entities: entities,
      }),
    });

    expect(response.status).toBe(200);

    const professor = await response.json();
    expect(professor.knowledge).toBe(updatedKnowledge);
    expect(professor.entities).toEqual(entities);
  }, 15000);

  it('should process chat message', async () => {
    if (!testProfessorId) {
      console.log('Skipping: no test professor ID available');
      return;
    }

    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professorId: testProfessorId,
        message: 'hello',
        context: {},
        locale: 'en',
      }),
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result).toHaveProperty('answer');
    expect(result).toHaveProperty('context');
  }, 15000);

  it('should return 404 for non-existent professor', async () => {
    const response = await fetch(`${BASE_URL}/api/professors/99999`);
    expect(response.status).toBe(404);
  }, 10000);

  it('should return 405 for invalid method on professors', async () => {
    // PATCH is not allowed
    const response = await fetch(`${BASE_URL}/api/professors`, {
      method: 'PATCH',
    });
    expect(response.status).toBe(405);
  }, 10000);

  it('should return 405 for invalid method on professor by ID', async () => {
    // DELETE is not allowed on /api/professors/[id]
    const response = await fetch(`${BASE_URL}/api/professors/1`, {
      method: 'DELETE',
    });
    expect(response.status).toBe(405);
  }, 10000);
});
