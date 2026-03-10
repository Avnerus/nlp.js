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
  └── image-upload/
      └── POST        // Handle image upload, return URL/path
```

### Data Storage

- **Professors metadata:** JSON file in Vercel storage (`/data/professors.json`)
  ```json
  [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "field": "Industrial & Product Design",
      "imagePath": "/images/professors/uuid.jpg",
      "corpusPath": "/corpora/professors/uuid.json",
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

## Implementation Steps

### Phase 1: Backend Infrastructure (Blob-based)

1. **Install Vercel Blob SDK**
   - Add `@vercel/blob` to dependencies
   - Configure `BLOB_READ_WRITE_TOKEN` in `.env.local`

2. **Implement `/api/professors` routes**
   - `GET /api/professors` — return JSON array of all professors from Blob
   - `POST /api/professors` — create professor, generate UUID, upload image and corpus to Blob
     - Accepts FormData with: name, field, image (optional)

3. **Implement `/api/professors/[id]` routes**
   - `GET /api/professors/[id]` — return professor + corpus from Blob
   - `PUT /api/professors/[id]` — save updated corpus to Blob

4. **Implement `/api/chat` route**
   - Accept JSON with `{ professorId, message, locale }`
   - Load professor's corpus from Blob
   - Initialize NLP.js with that corpus
   - Return chatbot response

3. **Implement `/api/professors/[id]` routes**
   - `GET /api/professors/[id]` — return professor + corpus
   - `PUT /api/professors/[id]` — save updated corpus

4. **Implement `/api/chat` route**
   - Accept `{ professorId, message, locale }`
   - Load professor's corpus
   - Initialize NLP.js with that corpus
   - Return chatbot response

5. **Add image upload handler** (`/api/image-upload`)
   - Accept multipart form data
   - Save to `/public/images/professors/[professorId].jpg`
   - Return URL path

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
   - Form to create new professor:
     - Name input
     - Field dropdown (10 options from DESIGN.md)
     - Image upload → POST to `/api/image-upload`
     - Submit → POST to `/api/professors`

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

- **Professors:** `professors.json` (master index)
- **Corpora:** `corpora/{professorId}.json` (per professor)
- **Images:** `images/professors/{safeName}.ext` (per professor)

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

---

**Ready for review.** Once approved, I'll implement phase by phase and push changes.
