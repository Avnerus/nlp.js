import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API Tests', () => {
  // Note: These tests require a running local development server
  // Run with: npm run dev (in a separate terminal) then npm test
  // The server should be running on http://localhost:3000

  const BASE_URL = 'http://localhost:3000';

  beforeAll(async () => {
    // Initialize database before tests
    await fetch(`${BASE_URL}/api/init`);
  }, 20000);

  afterAll(async () => {
    // Cleanup after all tests
  }, 10000);

  it('should initialize database and create templates', async () => {
    const response = await fetch(`${BASE_URL}/api/init`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('knowledgeUrl');
    expect(data).toHaveProperty('entitiesUrl');
    expect(data.message).toContain('Database initialized');
  }, 10000);

  it('should list empty professors initially', async () => {
    const response = await fetch(`${BASE_URL}/api/professors`);
    expect(response.status).toBe(200);

    const professors = await response.json();
    expect(Array.isArray(professors)).toBe(true);
    // May be empty or have data depending on test setup
  }, 10000);

  it('should create a new professor', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Professor');
    formData.append('field', 'Industrial & Product Design');

    const response = await fetch(`${BASE_URL}/api/professors`, {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(201);

    const professor = await response.json();
    expect(professor).toHaveProperty('id');
    expect(professor.name).toBe('Test Professor');
    expect(professor.field).toBe('Industrial & Product Design');
    expect(professor).toHaveProperty('image');
    expect(professor).toHaveProperty('knowledge');
    expect(professor).toHaveProperty('entities');
    expect(professor).toHaveProperty('corpus');
  }, 15000);

  it('should get professor by ID', async () => {
    // First create a professor
    const formData = new FormData();
    formData.append('name', 'Get Test Professor');
    formData.append('field', 'Architecture');

    const createResponse = await fetch(`${BASE_URL}/api/professors`, {
      method: 'POST',
      body: formData,
    });

    const created = await createResponse.json();

    const response = await fetch(`${BASE_URL}/api/professors/${created.id}`);
    expect(response.status).toBe(200);

    const professor = await response.json();
    expect(professor.id).toBe(created.id);
    expect(professor.name).toBe('Get Test Professor');
  }, 15000);

  it('should update professor knowledge and entities', async () => {
    // First create a professor
    const formData = new FormData();
    formData.append('name', 'Update Test Professor');
    formData.append('field', 'Fashion Design');

    const createResponse = await fetch(`${BASE_URL}/api/professors`, {
      method: 'POST',
      body: formData,
    });

    const created = await createResponse.json();

    const updatedKnowledge = `- intent: greetings.hello
  utterances:
    - hello
    - hi
  answers:
    - Hello there!
`;

    const entities = { username: { trim: [] } };

    const response = await fetch(`${BASE_URL}/api/professors/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        knowledge: updatedKnowledge,
        entities: entities,
        corpus: {
          name: 'Corpus',
          locale: 'en-US',
          data: [
            {
              intent: 'greetings.hello',
              utterances: ['hello', 'hi'],
              answers: ['Hello there!'],
            },
          ],
          entities: entities,
        },
      }),
    });

    expect(response.status).toBe(200);

    const professor = await response.json();
    expect(professor.knowledge).toBe(updatedKnowledge);
    expect(professor.entities).toEqual(entities);
  }, 15000);

  it('should process chat message', async () => {
    // First create a professor
    const formData = new FormData();
    formData.append('name', 'Chat Test Professor');
    formData.append('field', 'Graphic Design');

    const createResponse = await fetch(`${BASE_URL}/api/professors`, {
      method: 'POST',
      body: formData,
    });

    const created = await createResponse.json();

    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professorId: created.id,
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

  it('should delete a professor', async () => {
    // First create a professor
    const formData = new FormData();
    formData.append('name', 'Delete Test Professor');
    formData.append('field', 'Game Design');

    const createResponse = await fetch(`${BASE_URL}/api/professors`, {
      method: 'POST',
      body: formData,
    });

    const created = await createResponse.json();

    // Verify it exists
    let listResponse = await fetch(`${BASE_URL}/api/professors`);
    let professors = await listResponse.json();
    expect(professors.some((p) => p.id === created.id)).toBe(true);

    // Delete it
    const deleteResponse = await fetch(`${BASE_URL}/api/professors`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: created.id }),
    });

    expect(deleteResponse.status).toBe(200);

    const deleteResult = await deleteResponse.json();
    expect(deleteResult.success).toBe(true);

    // Verify it's gone
    listResponse = await fetch(`${BASE_URL}/api/professors`);
    professors = await listResponse.json();
    expect(professors.some((p) => p.id === created.id)).toBe(false);
  }, 20000);

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
