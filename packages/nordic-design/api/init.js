import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL_UNPOOLED);

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
        "created_at" timestamp
      );
   `);

  // Upload knowledge.yaml template with comments
  const knowledgeTemplate = `# Knowledge YAML Template
# This file defines the chatbot's knowledge using a simple YAML format.

# We use a Natural Language Processing library (https://github.com/axa-group/nlp.js). It uses Levenshtein distance (https://en.wikipedia.org/wiki/Levenshtein_distance) to find the closest match between what the user wrote and available utterances to find the user intent.

# Each intent starts with "- intent:" with a name for the intent and followed by its utterances and answers.

# Here is an example of "intents", "utterances" (=questions) and "answers" where the user wants to know about "Alvar Aalto".

- intent: know.alvaraalto
# These are the questions (question mark not needed):
  utterances:
    - who is Alvar Aalto
    - do you know Alvar Aalto
# The answer is choosen randomly from these:
  answers:
    - Alvar Aalto is a Finnish architect and a designer.
    - Alvar Aalto founded the furniture company Artek!

# You may copy and edit the text above to create more "intents", "utterances" (=questions) and "answers". Rembmer to name your intents and start each intent with a dash and space!


# Here is an example of an answer with multiple lines. It should start with the symbol "|", followed be each line starting at the same column.
- intent: agent.fields
  utterances:
    - what are your fields of expertise
    - what fields do you teach
  answers: 
    - |
      1. Industrial design.
      2. Product design.

# This is the default response
- intent: None
  utterances:
    - what should I do
  answers:
    - I know!
    - Great question!

# This is the initial greeting
- intent: greetings.hello
  utterances:
    - hello
    - hi
    - howdy
  answers:
    - Greetings! Nice to meet you!

##########################################################
# More examples
##########################################################

# Here the user wants to know more about the agent.
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
# Then it chooses randomly an answer from here.
  answers:
    - I'm a virtual agent
    - Think of me as a virtual agent
    - Well, I'm not a person, I'm a virtual agent
    - I'm a virtual being, not a real person
    - I'm a conversational app




################################################################
# Advanced usage, inferring data entities from the user's text.
################################################################

# Asks for username if not provided
- intent: greetings.doyouknow
  utterances:
    - do you know who I am
  answers:
    - "{{ username === 'Student' ? 'My creator! (along with fattybear). Honored to meet you.' : 'Greetings ' + username + '! Nice to meet you!' }}"
# This section means that if the username entity was not filled, the bot should fill it with the following question.
  slotFilling:
    username:
      mandatory: true
      question: "I don't think we've met! What is your name?"


# Likes the user - gives different response for student vs others
- intent: user.likeagent
  utterances:
    - I like you
    - I really like you
    - you're so special
    - I like you so much
  answers:
    - answer: "Of course, because you created me."
      opts: "entities.username.option === 'student'"
    - answer: "Likewise!"
      opts: "entities.username.option !== 'student'"
    - answer: "That's great to hear!"
      opts: "entities.username.option !== 'student'"
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
          student: ['Student'],
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
