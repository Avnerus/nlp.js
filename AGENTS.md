# AGENTS.md - Development Guide for NLP.js Fork

**Forked from:** `axa-group/nlp.js`  
**Current version:** 4.27.0  
**Last updated:** 2026-03-08

---

## Project Overview

This is a fork of the NLP.js library — a general natural language processing utility for Node.js. It supports:

- Language detection
- Levenshtein distance for string similarity
- Stemmers and tokenizers for 40+ languages (104 with BERT)
- Sentiment analysis with negation support
- Named Entity Recognition (NER)
- Intent classification (NLU)
- Natural Language Generation (NLG)
- Slot filling
- 40 languages natively, 104 with BERT integration

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | JavaScript (Node.js) |
| Package Manager | npm + Lerna (monorepo) |
| Testing | Jest |
| Linting | ESLint (Airbnb config) |
| Logging | Pino |
| Container System | Custom dependency injection container |
| Plugin Architecture | Registerable, swappable plugins |

---

## Architecture

NLP.js v4 is split into **independent packages** that work together via a **container-based plugin system**.

### Core Packages

| Package | Purpose |
|---------|---------|
| `@nlpjs/core` | Core container, configuration, and base classes |
| `@nlpjs/nlp` | Main NLP manager — combines NLU, NER, NLG, Sentiment |
| `@nlpjs/nlu` | Natural Language Understanding (intent classification) |
| `@nlpjs/ner` | Named Entity Recognition |
| `@nlpjs/nlg` | Natural Language Generation (answers) |
| `@nlpjs/sentiment` | Sentiment analysis |
| `@nlpjs/slot` | Slot filling for structured extraction |
| `@nlpjs/similarity` | String similarity algorithms (Levenshtein) |
| `@nlpjs/neural` | Neural network classifier |
| `@nlpjs/language-*` | Per-language packages (`lang-en`, `lang-es`, etc.) |
| `@nlpjs/connector` | Base for chatbot connectors |
| `@nlpjs/console-connector` | Console-based chat interface |

### Package Relationships

```
@nlpjs/core
    ↑
    ├── @nlpjs/nlu (uses neural, similarity, language)
    ├── @nlpjs/ner (uses similarity, language)
    ├── @nlpjs/nlg
    ├── @nlpjs/sentiment (uses neural, language)
    └── @nlpjs/slot
            ↑
    @nlpjs/nlp (orchestrates all above)
            ↑
    @nlpjs/basic (bundles nlp + connectors + logger)
```

---

## Development Setup

### Prerequisites

- Node.js (npm installed)
- Git with SSH key configured (`/home/nixos/.openclaw/workspace/ssh_key_fattybear`)

### Installation

```bash
cd /home/nixos/.openclaw/workspace/projects/nlp.js
npm install
```

This runs `lerna bootstrap` (via `postinstall`) which:
- Installs dependencies in each package
- Creates symlinks between local packages

Make sure to run this after every `git pull`.

### Running Tests

```bash
npm test
```

Runs ESLint + Jest with coverage.

### Linting

```bash
npm run lint          # Check
npm run lintfix       # Auto-fix
```

---

## QuickStart: Basic Chatbot Example

### 1. Install Dependencies

```bash
npm install node-nlp
```

### 2. Create `bot.js`

```javascript
const { NlpManager } = require('node-nlp');

const manager = new NlpManager({ languages: ['en'], forceNER: true });

// Add utterances and intents
manager.addDocument('en', 'goodbye for now', 'greetings.bye');
manager.addDocument('en', 'bye bye take care', 'greetings.bye');
manager.addDocument('en', 'hello', 'greetings.hello');
manager.addDocument('en', 'hi', 'greetings.hello');

// Add answers
manager.addAnswer('en', 'greetings.bye', 'Till next time');
manager.addAnswer('en', 'greetings.bye', 'See you soon!');
manager.addAnswer('en', 'greetings.hello', 'Hey there!');
manager.addAnswer('en', 'greetings.hello', 'Greetings!');

// Train and save
(async () => {
  await manager.train();
  manager.save();
  
  // Test
  const response = await manager.process('en', 'I should go now');
  console.log(response);
})();
```

### 3. Run

```bash
node bot.js
```

---

## Running the Console Connector Example

The repo includes working examples in `/examples/`:

```bash
cd examples/02-qna-classic
node index.js
```

This launches an interactive console bot with pre-trained intents about "the bot itself" (age, personality, etc.).

---

## Key Concepts

### Pipelines

A pipeline defines how text flows through NLP stages:

```
normalize → tokenize → removeStopwords → stem → arrToObj
```

Pipelines can be customized via configuration.

### Container System

The container manages dependencies and plugins:

```javascript
const nlp = new Nlp({ languages: ['en'] });
nlp.container.register('fs', fs);  // Register services
nlp.use(LangEn);                   // Register plugins
```

### Plugins

Every package is a plugin. You can:
- Replace default plugins
- Add custom plugins
- Configure plugins per language/domain

---

## Testing Your Changes

1. Add tests in `packages/*/test/` or `tests/`
2. Run `npm test`
3. Check coverage in `tests/coverage/`

---

## Contributing Guidelines

- Follow existing code style (ESLint + Prettier)
- Add/update tests for new features
- Update documentation if needed
- Bump package versions with Lerna (`lerna version`)
- Run `npm run lintfix` before commit

---

## Useful Commands

```bash
# Build all packages
lerna run build

# Run tests for specific package
cd packages/nlp && npm test

# Publish to npm (maintainers only)
lerna publish
```

---

## Notes for Fattybear

- This is a **fork** — changes can be upstreamed or kept separate
- The quickstart example (`examples/02-qna-classic`) is a good reference for basic usage
- Language support is modular (`@nlpjs/lang-en`, etc.)
- For multilingual bots, register multiple language packages
- Models can be saved/loaded with `manager.save()` / `manager.load()`

---

*This file is part of the `Avnerus/nlp.js` repository fork.*
