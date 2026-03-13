# PLAN.md - Nordic Design Professor Chatbot

> **Project:** `nordic-design` package in `nlp.js` monorepo  
> **Target deployment:** Vercel Serverless (API routes + static frontend)  
> **Current status:** Backend complete with Neon database integration, frontend implemented

---

## Overview

We need to build a web application where students can create custom chatbots modeled after Nordic design professors. The app should allow:

1. Creating a professor profile (name, image, field)
2. "Coding" the chatbot by modifying its behavior via YAML knowledge + JSON entities
3. Testing the chatbot with a live preview
4. Chatting with existing professors

---

## Architecture

### Backend (Vercel Serverless)

```
/api/
  ├── professors/
  │   ├── GET         // List all professors (database)
  │   ├── POST        // Create new professor (database + blob)
  │   └── DELETE      // Delete professor (database + blob)
  │
  ├── professors/[id]/
  │   ├── GET         // Get professor details + knowledge/entities (database)
  │   └── PUT         // Update professor knowledge/entities (database)
  │
  ├── chat/
  │   └── POST        // Process user message → return chatbot response
  │
  └── init/
      └── GET         // Initialize database and create templates in blob
```

### Data Storage

- **Professors metadata & knowledge:** PostgreSQL database (Neon serverless)
  ```json
  {
    "id": 1,
    "name": "Ingrid Nordman",
    "field": "Industrial & Product Design",
    "image": "https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/images/professors/...",
    "knowledge": "- intent: greetings.hello\n  utterances:\n    - hello\n  answers:\n    - Hi!\n",
    "entities": {"username": {...}},
    "corpus": {"name": "Corpus", "locale": "en-US", "data": [...], "entities": {...}},
    "created_at": "2026-03-12T10:00:00.000Z"
  }
  ```
  - **Schema:** `id` (integer, auto-increment), `name`, `field`, `image`, `knowledge` (text/YAML), `entities` (text/JSON), `corpus` (text/JSON), `created_at`

- **Knowledge:** Stored in Neon database as YAML text
- **Entities:** Stored in Neon database as JSON text
- **Corpus:** Merged JSON stored as text in database
- **Images:** Stored in Vercel Blob (`images/professors/` prefix)
- **Templates:** `knowledge.yaml` and `entities.json` in Vercel Blob

### Frontend (Static Pages)

```
/public/
  ├── index.html          // Professor listing + create form
  ├── professors.html     // Professor profile + knowledge editor (YAML) + entities editor (JSON)
  ├── chat.html           // Chat interface
```

---

## Vercel Deployment

**Token location:** `/run/secrets/vercel-token`  
**Command:** `npx vercel --prod -t "$VERCEL_TOKEN" --yes`

To deploy:
1. Export the token: `export VERCEL_TOKEN=$(cat /run/secrets/vercel-token)`
2. Run: `npx vercel --prod -t "$VERCEL_TOKEN" --yes`

---

## Implementation Steps - Complete

### Phase 1: Backend Infrastructure (Database + Blob)

1. **Install dependencies**
   - Added `@neondatabase/serverless` for PostgreSQL
   - `@vercel/blob` for image storage
   - `busboy` for FormData parsing
   - `cors` for CORS headers

2. **Database initialization (`/api/init.js`)**
   - Creates `professors` table with schema:
     ```sql
     CREATE TABLE "professors" (
       "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       "name" text NOT NULL,
       "field" text,
       "image" text,
       "knowledge" text,      -- YAML format
       "entities" text,       -- JSON format
       "corpus" text,         -- Merged JSON
       "created_at" timestamp
     );
     ```
   - Creates `knowledge.yaml` template in Vercel Blob (with inline comments)
   - Creates `entities.json` template in Vercel Blob

3. **Professor CRUD operations**
   - `GET /api/professors` — Fetch all professors from database (ordered by creation date)
   - `POST /api/professors` — Create professor:
     - Upload image to Vercel Blob
     - Load `knowledge.yaml` template from blob
     - Load `entities.json` template from blob
     - Parse YAML knowledge to JSON for corpus
     - Insert into database with `RETURNING id`
     - Return professor object with integer ID
   - `DELETE /api/professors` — Delete professor:
     - Delete image from blob using `del()`
     - Remove from database

4. **Professor detail operations (`/api/professors/[id]`)**
   - `GET /api/professors/[id]` — Fetch professor + knowledge (YAML) + entities (JSON) from database
   - `PUT /api/professors/[id]` — Update knowledge (YAML), entities (JSON), and corpus in database
     - Parses YAML knowledge to JSON
     - Merges knowledge + entities into corpus

5. **Chat endpoint (`/api/chat`)**
   - Accepts `{ professorId, message, context, locale }`
   - Fetches professor from database by integer ID
   - Parses corpus JSON and passes to NLP engine
   - Returns chatbot response

### Phase 2: NLP.js Integration

1. **`src/nlp-engine.js`** — Reusable NLP engine factory
   - Accepts corpus JSON object directly
   - Loads corpus into NLP manager
   - Returns trained NLP instance

2. **Corpus storage**
   - Individual professor corpora stored in database as JSON text
   - Corpus is built from knowledge (YAML) + entities (JSON)
   - Chat endpoint parses corpus JSON before passing to NLP engine

### Phase 3: Frontend - HTML version for Vercel static hosting

1. **`/public/index.html`** - Professor listing + create form
   - `GET /api/professors` → render list of existing professors
   - Form to create new professor (multipart/form-data with `busboy` on backend):
     - Name input
     - Field dropdown (10 options from DESIGN.md)
     - Image upload → POST to `/api/professors`
     - Submit → POST to `/api/professors`
     - Response includes `id`, `image`, and `corpus` data

2. **`/public/professors.html`** - Professor profile + knowledge editor
   - `GET /api/professors/[id]` → load professor + knowledge + entities from database
   - **YAML Editor (CodeMirror):**
     - `@codemirror/lang-yaml` for YAML syntax highlighting
     - Custom `smartYamlEnter` handler for intelligent indentation
     - Auto-completion with NLP keywords (intent, utterances, answers)
     - One-dark theme for dark mode support
   - **Entities Editor (Plain Text):**
     - Textarea for editing entities JSON
     - Parses JSON before saving
   - "Save" button → `PUT /api/professors/[id]` with knowledge, entities, corpus
   - "Test Chatbot" link → `/chat.html?id=[id]`

3. **`/public/chat.html`** - Chat interface
   - Render professor image/name at top
   - Chat UI (input + message list)
   - `POST /api/chat` with JSON `{ professorId, message }`
   - Stream/return responses

---

## Key Fixes Applied

**1. Database Schema**
- Integer `id` with `GENERATED ALWAYS AS IDENTITY` (auto-increment)
- `knowledge` stored as text type (YAML string)
- `entities` stored as text type (JSON string)
- `corpus` stored as text type (merged JSON string)
- `created_at` timestamp for ordering

**2. Vercel Blob Image Deletion**
- Uses `del()` from `@vercel/blob` for cleaner image cleanup
- Only deletes non-default images (skips `default.jpg`)

**3. Integer IDs**
- All professor IDs are now integers from the database
- `Number()` type coercion in SQL queries for safety

**4. Efficient Professor Creation**
- Uses `INSERT ... RETURNING id` to get the auto-generated integer ID in one query
- No need for separate `SELECT` after insert

**5. CORS Support**
- Added in `/api/chat` and `/api/professors/[id]` endpoints
- Preflight handling for OPTIONS requests

**6. Cache Control**
- Professors endpoints set proper cache headers:
  ```js
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  ```

**7. FormData Handling**
- `req.formData()` not available on Vercel Serverless
- Fixed with `busboy` stream parsing (`bodyParser: false` in `config.api`)
- Added `req.resume()` to consume request body before piping to busboy
- Minor workaround: empty `req.on('data', ...)` handler triggers busboy processing

**8. Knowledge & Entities Separation**
- Knowledge stored in YAML format (easier for students to edit)
- Entities stored separately as JSON (advanced users only)
- Corpus is dynamically built by merging knowledge + entities
- Templates provide safe defaults for both

---

## CodeMirror YAML Editor

**Dependencies:**
- `@codemirror/state` - Editor state management
- `@codemirror/view` - View layer
- `@codemirror/lang-yaml` - YAML language support
- `@codemirror/theme-one-dark` - Dark theme
- `@codemirror/autocomplete` - Auto-completion
- `@codemirror/commands` - Keyboard commands

**Key Features:**
- Smart Enter key for auto-indentation in YAML lists
- Auto-completion for intent, utterances, answers, slotFilling
- YAML syntax highlighting
- One-dark theme support
- Custom indentation (2 spaces)

**YAML Format:**
```yaml
- intent: greetings.hello
  utterances:
    - hello
    - hi
    - hey
  answers:
    - Hi there!
    - Hello!
  slotFilling:
    username:
      mandatory: true
      question: "What is your name?"
```

---

## Dependencies

```json
{
  "@neondatabase/serverless": "^1.0.2",
  "@nlpjs/basic": "4.27.0",
  "@nlpjs/console-connector": "^4.26.1",
  "@nlpjs/core-loader": "^4.26.1",
  "@nlpjs/evaluator": "^4.26.1",
  "@nlpjs/lang-en": "^4.26.1",
  "@nlpjs/logger": "^4.26.1",
  "@nlpjs/nlp": "^4.27.0",
  "@vercel/blob": "^0.23.0",
  "busboy": "^1.6.0",
  "cors": "^2.8.5",
  "js-yaml": "^4.1.0"
}
```

---

## Vercel Configuration

Create `vercel.json` in the package root:

```json
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.js", "use": "@vercel/node" },
    { "src": "public/**/*", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

---

## Database Connection

Uses `@neondatabase/serverless` with template string syntax:

```javascript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

// Example queries:
const professors = await sql`SELECT * FROM professors ORDER BY created_at DESC`;
await sql`INSERT INTO professors (name, field, image, knowledge, entities, corpus, created_at) VALUES (${name}, ${field}, ${imageUrl}, ${knowledge}, ${JSON.stringify(entities)}, ${JSON.stringify(corpus)}, ${timestamp}) RETURNING id`;
const professor = await sql`SELECT * FROM professors WHERE id = ${Number(professorId)}`;
await sql`DELETE FROM professors WHERE id = ${Number(id)}`;
```

---

## Current Status

✅ **Backend complete** - All API endpoints implemented with Neon database:
- Professor CRUD operations
- Knowledge stored as YAML, entities as JSON
- Corpus dynamically built from knowledge + entities
- Images still stored in Vercel Blob

✅ **Frontend complete** - HTML pages implemented:
- `/public/index.html` - Professor listing + create form (no knowledge/entities fields)
- `/public/professors.html` - Professor profile + YAML editor for knowledge + JSON textarea for entities
- `/public/chat.html` - Chat interface

---

## Future Enhancements (Out of Scope)

- Multi-language support (`lang-fi`, `lang-sv`, `lang-nb`)
- Professor customization (personality traits via corpus editing)
- Export corpus as YAML/JSON
- Share professor URL
- Chat history persistence
- Admin dashboard

---

## Notes

- **Current model:** `local-llama/qwen3-coder-next` (runtime) / `default_model` same
- **Workspace:** `/home/nixos/.openclaw/workspace/projects/nlp.js`
- **Push target:** `git@github.com:Avnerus/nlp.js.git`
- **Database:** Neon PostgreSQL (serverless)
- **Blob storage:** `vercel_blob_rw_0tq3xJdZh1emKCko_poIWDphXoScx6cxoRx7xFOu8FiHPl5`
- **Template URLs:**
  - `https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/knowledge.yaml`
  - `https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/entities.json`
- **Default image URL:** `https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/images/default.jpg`

---

## Key Constraints

- **FormData parsing** — `req.formData()` not available; set `bodyParser: false` and use `busboy` instead
- **Neon SQL syntax** — Use template strings: `await sql\`SELECT * FROM table WHERE id = \${id}\``
- **YAML format** — Array of intents starting with `- intent:`
- **Entities** — Optional, advanced users only; leave empty to use template defaults

---

## Testing

**Run tests for every non-frontend change:**

```bash
# All tests
npm test

# API tests (requires running dev server)
npm run test:api

# NLP engine tests
npm run test:nlp
```

**Test files:**
- `__tests__/api.test.js` — Integration tests for all API endpoints
- `__tests__/nlp-engine.test.js` — Unit tests for NLP engine
- `__tests__/nordic-design.test.js` — Basic package test

**Run dev server for API tests:**
```bash
npm run dev
```

---

**Ready for review.** All features implemented and tested.
