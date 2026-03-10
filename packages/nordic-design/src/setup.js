const fs = require('fs').promises;
const path = require('path');

// Copy corpus template to data/corpora
async function setupInitialCorpus(professorId) {
  const templatePath = path.join(__dirname, '..', 'corpus-en.json');
  const corporaDir = path.join(__dirname, '..', 'data', 'corpora');
  const corpusPath = path.join(corporaDir, `${professorId}.json`);
  
  await fs.mkdir(corporaDir, { recursive: true });
  
  const template = require(templatePath);
  await fs.writeFile(corpusPath, JSON.stringify(template, null, 2));
  
  return corpusPath;
}

module.exports = { setupInitialCorpus };
