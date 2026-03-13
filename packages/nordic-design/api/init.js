import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  // Connect to the Neon database and create table if not exists
  await sql.query('DROP TABLE IF EXISTS "professors"');
  await sql.query(`
      CREATE TABLE "professors" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "professors_id_seq"),
        "name" text NOT NULL,
        "field" text,
        "image" text,
        "knowledge" text,
        "entities" text,
        "corpus" text,
        "created_at" timestamp
      );
   `);

  // Upload knowledge.yaml template with comments
  const knowledgeTemplate = `# Knowledge YAML Template
# This file defines the chatbot's knowledge using a simple YAML format.
# Each intent starts with "- intent:" followed by its utterances and answers.
# Comments (lines starting with #) are ignored.

# Basic greeting - asks for username if not provided
- intent: greetings.hello
  utterances:
    - hello
    - hi
    - howdy
  answers:
    - "{{ username === 'Avner' ? 'My creator! (along with fattybear). Honored to meet you.' : 'Greetings ' + username + '! Nice to meet you!' }}"
  slotFilling:
    username:
      mandatory: true
      question: "I don't think we've met! What is your name?"

# Agent introduction - tells about the virtual agent
- intent: agent.acquaintance
  utterances:
    - say about you
    - why are you here
    - what is your personality
    - describe yourself
    - tell me about yourself
    - tell me about you
    - what are you
    - who are you
    - I want to know more about you
    - talk about yourself
  answers:
    - I'm a virtual agent
    - Think of me as a virtual agent
    - Well, I'm not a person, I'm a virtual agent
    - I'm a virtual being, not a real person
    - I'm a conversational app

# Likes the user - gives different response for Avner vs others
- intent: user.likeagent
  utterances:
    - I like you
    - I really like you
    - you're so special
    - I like you so much
  answers:
    - answer: "Of course, because you created me."
      opts: "entities.username.option === 'avner'"
    - answer: "Likewise!"
      opts: "entities.username.option !== 'avner'"
    - answer: "That's great to hear!"
      opts: "entities.username.option !== 'avner'"
`;

  const knowledgeBlob = await put('knowledge.yaml', knowledgeTemplate, {
    access: 'public',
    contentType: 'text/yaml',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // Upload entities.json template
  const entitiesTemplate = JSON.stringify(
    {
      username: {
        trim: [
          {
            position: 'afterLast',
            words: ['am', 'is', 'name is'],
            opts: { caseSensitive: false },
          },
        ],
        options: {
          avner: ['Avner'],
        },
      },
    },
    null,
    2
  );

  const entitiesBlob = await put('entities.json', entitiesTemplate, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  res.status(200).json({
    message:
      'Database initialized with knowledge.yaml and entities.json templates',
    knowledgeUrl: knowledgeBlob.url,
    entitiesUrl: entitiesBlob.url,
  });
}
