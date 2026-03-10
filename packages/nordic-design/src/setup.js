import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function setupInitialCorpus(professorId) {
  const templatePath = path.join(__dirname, '..', 'corpus-en.json');
  const corporaDir = path.join(__dirname, '..', 'data', 'corpora');
  const corpusPath = path.join(corporaDir, `${professorId}.json`);
  
  const template = await import(templatePath);
  
  await writeFile(corporaDir, { recursive: true });
  await writeFile(corpusPath, JSON.stringify(template, null, 2));
  
  return corpusPath;
}
