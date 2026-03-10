const { createNlp } = require('../src/nlp-engine');
const fs = require('fs').promises;
const path = require('path');

async function initializeProfessorsIndex() {
  const dataDir = path.join(__dirname, '..', 'data');
  const corporaDir = path.join(dataDir, 'corpora');
  const professorsFile = path.join(dataDir, 'professors.json');
  
  // Create directories if they don't exist
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(corporaDir, { recursive: true });
  
  // Initialize professors index if it doesn't exist
  try {
    await fs.access(professorsFile);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(professorsFile, JSON.stringify([], null, 2));
    } else {
      throw err;
    }
  }
  
  return professorsFile;
}

module.exports = { initializeProfessorsIndex };
