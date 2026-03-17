import { put } from '@vercel/blob';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL_UNPOOLED);

export default async function handler(req, res) {
  // Safety check: Only allow init in development mode
  // This prevents accidental database clearing in production
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (!isDev) {
    return res.status(403).json({ 
      error: 'Database initialization is not allowed in production mode',
      suggestion: 'Use a development environment or local database for testing'
    });
  }
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
  const knowledgeTemplate = `##########################################################
# KNOWLEDGE YAML TEMPLATE
##########################################################

# This file tells your chatbot:
#   - what topics it knows (intents)
#   - how people might ask about them (utterances)
#   - what it should answer (answers)
#
# HOW TO USE THIS FILE
# 1) Copy the example block below.
# 2) Change the intent name (after "intent:") to your own topic.
# 3) Replace the utterances with example questions users might ask.
# 4) Replace the answers with the replies you want the bot to give. It chooses the answers randomly from the list.
#
# The project uses a Natural Language Processing library (https://github.com/axa-group/nlp.js). It calculates a Levenshtein distance (https://en.wikipedia.org/wiki/Levenshtein_distance) to find the closest match between what the user wrote and available utterances to find the user intent.
#
# You can create one such block for each topic your bot should know.
# You may copy-paste this and edit.

- intent: know.alvaraalto
  utterances:
    - who is Alvar Aalto
    - do you know Alvar Aalto
  answers:
    - Alvar Aalto was a Finnish architect and designer, known as one of the greatest modernists and for his furniture design.
    - Alvar Aalto founded the furniture company Artek, which still manufactures and sells many of his original designs.


# Here is an example of an answer with multiple lines / paragaphs. It should start with the symbol "|", followed be each line starting at the same column.

- intent: agent.aaltosbuildings
  utterances:
    - what are the most important buildings Alvar Aalto designed
  answers: 
    - |
      Alvar's most famous works of architecture are in Finland. For instance, Paimio Sanatorium close to Turku and FInlandia Hall in Helsinki are considered as international master pieces.

      Aalto never really made an international carrier, although he was a professor of MIT in USA during the war time, in 1940's. While at MIT, he designed the iconic Baker House student dormitory.


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
# These examles use the "Entity" JSON definition file. It matches the user's text with specific patterns to fill in data entities for the conversation context. Check the Entities JSON section on the edit page.

# ELIZA style use of the bodypart entity

- intent: health.complaint
  utterances:
    - My @bodypart hurts
    - I have a pain in my @bodypart
    - My @bodypart is sore
  answers:
    - I'm sorry to hear that your {{bodypart}} hurts. Have you seen a doctor?
    - Why do you think your {{bodypart}} is bothering you

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

# Remember a value in the conversation context
- intent: user.impatient
  utterances:
    - keep your answers short
    - try to be concise
  answers:
    - answer: I already know I should keep it short.
      opts: "impatient === 'true'"
    - answer: I'll remember to keep it short next time.
      opts: "impatient !== 'true'"
  actions:
  - name: setContext
    parameters: [ "impatient", "true" ]

# Increment a value in the conversation context
- intent: user.agentstupid
  utterances:
    - you are stupid
    - you are not smart
  answers:
    - answer: Perhaps you are not asking the right questions.
      opts: "!saidStupid"
    - answer: You have said this to me {{saidStupid}} times before.
      opts: "saidStupid > 0"
  actions:
  - name: increment
    parameters: [ "saidStupid" ]

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
     bodypart: {
       regex: "/(?:head|arm|leg|stomach|back)/gi"
      },
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
      }
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
