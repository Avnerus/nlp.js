# PLAN.md - Nordic Design Professor Chatbot

> **Project:** `nordic-design` package in `nlp.js` monorepo  
> **Target deployment:** Vercel Serverless (API routes + static frontend)  
> **Current status:** Backend complete with Neon database integration, frontend in progress

---

## Overview

We need to build a web application where students can create custom chatbots modeled after Nordic design professors. The app should allow:

1. Creating a professor profile (name, image, field)
2. "Coding" the chatbot by modifying its behavior via JSON corpus
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
  │   ├── GET         // Get professor details + corpus (database)
  │   └── PUT         // Update professor corpus (database)
  │
  ├── chat/
  │   └── POST        // Process user message → return chatbot response
  │
  └── init/
      └── GET         // Initialize database and create corpus template in blob
```

### Data Storage

- **Professors metadata & corpora:** PostgreSQL database (Neon serverless)
  ```json
  {
    "id": 1,
    "name": "Jane Doe",
    "field": "Industrial & Product Design",
    "image": "https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/images/professors/...",
    "corpus": { "name": "Corpus", "locale": "en-US", ... },
    "created_at": "2026-03-12T10:00:00.000Z"
  }
  ```
  - **Schema:** `id` (integer, auto-increment), `name`, `field`, `image`, `corpus` (text/JSON), `created_at`

- **Corpora:** Stored in Neon database as JSON text
- **Images:** Stored in Vercel Blob (`images/professors/` prefix)
- **Template corpus:** `corpus-en.json` in Vercel Blob (hardcoded URL used during professor creation)

### Frontend (Static Pages)

```
/public/
  ├── index.html          // Professor listing + create form
  ├── professors.html     // Professor profile + corpus editor
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
       "corpus" text,
       "created_at" timestamp
     );
     ```
   - Creates `corpus-en.json` template in Vercel Blob

3. **Professor CRUD operations**
   - `GET /api/professors` — Fetch all professors from database (ordered by creation date)
   - `POST /api/professors` — Create professor:
     - Upload image to Vercel Blob
     - Parse template corpus from blob
     - Insert into database with `RETURNING id`
     - Return professor object with integer ID
   - `DELETE /api/professors` — Delete professor:
     - Delete image from blob using `del()`
     - Remove from database

4. **Professor detail operations (`/api/professors/[id]`)**
   - `GET /api/professors/[id]` — Fetch professor + parsed corpus from database
   - `PUT /api/professors/[id]` — Update corpus in database

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
   - Template corpus (`corpus-en.json`) stored in Vercel Blob
   - Individual professor corpora stored in database as JSON text
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

2. **`/public/professors.html`** - Professor profile + corpus editor
   - `GET /api/professors/[id]` → load professor + corpus from database
   - JSON editor (Ace Editor or CodeMirror)
   - "Save" button → `PUT /api/professors/[id]`
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
- `corpus` stored as text type (JSON string)
- `created_at` timestamp for ordering

**2. Vercel Blob Image Deletion**
- Uses `del()` from `@vercel/blob` for cleaner image cleanup
- Only deletes non-default images (skips `default-professor.jpg`)

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
  "cors": "^2.8.5"
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
await sql`INSERT INTO professors (name, field, image, corpus, created_at) VALUES (${name}, ${field}, ${imageUrl}, ${JSON.stringify(corpus)}, ${timestamp}) RETURNING id`;
const professor = await sql`SELECT * FROM professors WHERE id = ${Number(professorId)}`;
await sql`DELETE FROM professors WHERE id = ${Number(id)}`;
```

---

## Current Status

✅ **Backend complete** - All API endpoints implemented with Neon database:
- Professor CRUD operations
- Integer IDs with auto-increment
- Corpus stored as JSON in database
- Images still stored in Vercel Blob

⏳ **Frontend in progress** - HTML pages need to be created:
- `/public/index.html` - Professor listing + create form
- `/public/professors.html` - Professor profile + corpus editor
- `/public/chat.html` - Chat interface

---

## Future Enhancements (Out of Scope)

- Multi-language support (`lang-fi`, `lang-sv`, `lang-nb`)
- Professor customization (personality traits via corpus editing)
- Export corpus as JSON
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
- **Template corpus URL:** `https://ndxbhqxzhbvdiq8b.public.blob.vercel-storage.com/corpus-en.json`
- **Default image URL:** `https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/images/professors/default-professor.jpg`

---

## Key Constraints

- **FormData parsing** — `req.formData()` not available; set `bodyParser: false` and use `busboy` instead
- **Neon SQL syntax** — Use template strings: `await sql\`SELECT * FROM table WHERE id = \${id}\``

---

**Ready for review.** Once approved, frontend implementation can proceed.
