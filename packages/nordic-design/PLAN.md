# PLAN.md - Nordic Design Professor Chatbot

> **Project:** `nordic-design` package in `nlp.js` monorepo  
> **Target deployment:** Vercel Serverless (API routes + static frontend)  
> **Current status:** Base structure exists, needs full implementation per DESIGN.md

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
  │   ├── GET         // List all professors
  │   └── POST        // Create new professor
  │
  ├── professors/[id]/
  │   ├── GET         // Get professor details + corpus
  │   └── PUT         // Update professor corpus
  │
  ├── chat/
  │   └── POST        // Process user message → return chatbot response
  │
  └── professors/
      └── init/         // Initialize professors.json index
```

### Data Storage

- **Professors metadata:** JSON file in Vercel storage (`professors.json`)
  ```json
  [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "field": "Industrial & Product Design",
      "image": "https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/images/professors/...",
      "corpus": "https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/corpora/...",
      "createdAt": "2026-03-10T..."
    }
  ]
  ```

- **Corpora:** Stored in Vercel Blob (`corpora/` prefix)
- **Images:** Stored in Vercel Blob (`images/professors/` prefix)

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

## Key Fixes Applied (Study Summary)

**1. Vercel Blob URL-Only Access**
- Vercel Blob only returns URLs from `put()`; no `get()` function exists
- All data fetches use `fetch(blobUrl)` with the URLs stored in `professors.json`
- Both `professors.json` and `corpus-en.json` use `addRandomSuffix: false` for stable URLs

**2. FormData Handling**
- `req.formData()` not available on Vercel Serverless
- Fixed with `busboy` stream parsing (`bodyParser: false` in `config.api`)
- Added `req.resume()` to consume request body before piping to busboy
- Minor workaround: empty `req.on('data', ...)` handler triggers busboy processing

**3. Corpus Loading Architecture**
- Removed `import()` for local JSON (not compatible with Vercel Blob)
- Template corpus hardcoded in `/api/init.js` → stored as Blob URL
- Each professor's corpus is fetched via `fetch(professor.corpus)` at runtime

**4. API Simplifications**
- `/api/professors/init.js` removed; consolidated into `/api/init.js`
- `/api/professors/[id].js` simplified: GET/PUT logic merged into single handler
- Removed `get()` calls from Vercel Blob SDK usage

**5. NLP.js Engine Changes**
- `createNlp()` now accepts corpus JSON directly (not a path)
- Removed file system import; accepts parsed JSON object

**6. Vercel Configuration**
- Added `((?!api/).*)` rewrite pattern to serve static files while preserving API routes
- Prevents `/api/*` requests from being redirected to `/public/api/*`

---

## Implementation Steps

### Phase 1: Backend Infrastructure (Blob-based)

1. **Install Vercel Blob SDK**
   - Add `@vercel/blob` to dependencies
   - Configure `BLOB_READ_WRITE_TOKEN` in `.env.local`

2. **Initialize professors.json**
   - `GET /api/init` — create `professors.json` and `corpus-en.json` in Blob with `addRandomSuffix: false`
   - Both URLs returned and used as hardcoded references

3. **Implement `/api/professors` routes**
   - `GET /api/professors` — return JSON array of all professors from Blob (using hardcoded URL)
   - `POST /api/professors` — create professor with `bodyParser: false` + `busboy` for FormData parsing
     - Upload image to `images/professors/{safeName}.ext`
     - Upload corpus to `corpora/{professorId}.json`
     - Store `corpus` URL in professor object
     - Append to `professors.json` index
     - Response includes `image` and `corpus` URLs (full Blob URLs, not paths)

4. **Implement `/api/professors/[id]` routes**
   - `GET /api/professors/[id]` — return professor + corpus from Blob
   - `PUT /api/professors/[id]` — save updated corpus to Blob

5. **Implement `/api/chat` route**
   - Accept `{ professorId, message, locale }`
   - Fetch professor from `professors.json`
   - Load corpus from `professor.corpus` URL (Blob returns full URL from `put()`)
   - Initialize NLP.js with that corpus
   - Return chatbot response

---

### Phase 2: NLP.js Integration

The corpus is now stored in Vercel Blob. We need to:

1. **Use `src/nlp-engine.js`** — reusable NLP engine factory that loads corpus from Blob
2. **Modify `/api/chat`** to load corpus from Blob using `get()` from `@vercel/blob`
3. **Test locally** with `vercel dev`
     return nlp;
   }
   
   module.exports = { createNlp };
   ```

2. **Modify corpus loading in `/api/chat`**
   - Load professor's custom corpus (not `corpus-en.json`)
   - Use `createNlp(professor.corpusPath)` for each chat request

3. **Test locally** with `vercel dev`

---

### Phase 3: Frontend - HTML version for Vercel static hosting

1. **`/public/index.html`** - Professor listing + create form
   - `GET /api/professors` → render list of existing professors
   - Form to create new professor (multipart/form-data with `busboy` on backend):
     - Name input
     - Field dropdown (10 options from DESIGN.md)
     - Image upload → POST to `/api/professors`
     - Submit → POST to `/api/professors`
     - Response includes `image` and `corpus` URLs (full Blob URLs)

2. **`/public/professors.html`** - Professor profile + corpus editor
   - `GET /api/professors/[id]` → load professor + corpus from Blob
   - JSON editor (Ace Editor or CodeMirror)
   - "Save" button → `PUT /api/professors/[id]`
   - "Test Chatbot" link → `/chat.html?id=[id]`

3. **`/public/chat.html`** - Chat interface
   - Render professor image/name at top
   - Chat UI (input + message list)
   - `POST /api/chat` with JSON `{ professorId, message }`
   - Stream/return responses

---

### Phase 4: Corpora Management

The `corpus-en.json` template should be the base for all professors. We need:

1. **The template exists** at `corpus-en.json`
2. **Modify corpus loading logic** in `/api/chat` to handle professor-specific fields:
   - `{{ field }}`

3. **On professor creation**, copy template → custom corpus file (done in `api/professors.js`)

---

### Phase 5: Polish & Testing

1. **Add error handling** — professor not found, corpus invalid, etc.
2. **Add CORS headers** for Vercel serverless
3. **Test locally** with Vercel dev
4. **Add basic styling** (Tailwind or plain CSS)
5. **Deploy to Vercel** and test live

---

## Dependencies to Add

```json
// package.json
{
  "dependencies": {
    "@nlpjs/basic": "4.27.0",
    "@nlpjs/console-connector": "^4.26.1",
    "@nlpjs/core-loader": "^4.26.1",
    "@nlpjs/evaluator": "^4.26.1",
    "@nlpjs/lang-en": "^4.26.1",
    "@nlpjs/logger": "^4.26.1",
    "@nlpjs/nlp": "^4.27.0",
    "@vercel/blob": "^0.23.0",
    "cors": "^2.8.5"           // For Vercel API routes
  }
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

## Key Constraints (Vercel Blob Limitations)

- **No `get()` function** — only `put()` returns a URL, which must be used for subsequent fetching
- **No `fetch()` on server-side** — use `@vercel/blob` `get()` equivalent via `fetch(blobUrl)` on the stored URL
- **FormData parsing** — `req.formData()` not available; set `bodyParser: false` and use `busboy` instead

---

## Future Enhancements (Out of Scope)

- Multi-language support (`lang-fi`, `lang-sv`, `lang-nb`)
- Professor customization (personality traits via corpus editing)
- Export corpus as JSON
- Share professor URL
- Chat history persistence
- Admin dashboard

---

## Vercel Blob Storage

All data is stored in Vercel Blob (cloud storage):

- **Professors:** `professors.json` (master index, public URL)
- **Corpora:** `corpora/{professorId}.json` (per professor, full URL returned from `put()`)
- **Images:** `images/professors/{safeName}.ext` (per professor, full URL returned from `put()`)

**Important:** Vercel Blob's `put()` returns a full URL (not a path). We store these URLs directly in `professors.json` and use them to fetch corpora via `fetch()` (no `get()` function available).

## Frontend (HTML)

- **`/public/index.html`** - Professor listing + create form (multipart/form-data)
- **`/public/professors.html`** - Professor profile + corpus editor
- **`/public/chat.html`** - Chat interface


---

## Notes

- **Current model:** `local-llama/qwen3-coder-next` (runtime) / `default_model` same
- **Workspace:** `/home/nixos/.openclaw/workspace/projects/nlp.js`
- **Push target:** `git@github.com:Avnerus/nlp.js.git`
- **Blob storage:** `vercel_blob_rw_0tq3xJdZh1emKCko_poIWDphXoScx6cxoRx7xFOu8FiHPl5`
- **Hardcoded index URL:** `https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/professors.json`
- **Hardcoded corpus URL:** `https://0tq3xjdzh1emkcko.public.blob.vercel-storage.com/corpus-en.json`
- **Init endpoint:** `GET /api/init` creates both `professors.json` and `corpus-en.json` in Blob

---

## Key Constraints (Vercel Blob Limitations)

- **No `get()` function** — only `put()` returns a URL, which must be used for subsequent fetching
- **No `fetch()` on server-side** — use `@vercel/blob` `get()` equivalent via `fetch(blobUrl)` on the stored URL
- **FormData parsing** — `req.formData()` not available; set `bodyParser: false` and use `busboy` instead
- **No dynamic imports of local JSON** — corpora must be fetched from Blob URLs at runtime
- **Static corpora** — template corpus is hardcoded in `/api/init.js` instead of being imported from `corpus-en.json`

---

**Ready for review.** Once approved, I'll implement phase by phase and push changes.
