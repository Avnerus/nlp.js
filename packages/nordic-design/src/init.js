import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function initializeProfessorsIndex() {
  const dataDir = path.join(__dirname, '..', 'data');
  const professorsFile = path.join(dataDir, 'professors.json');
  
  // Create directories if they don't exist
  await writeFile(path.join(dataDir, 'professors.json'), JSON.stringify([], null, 2), 'utf8').catch(err => {
    if (err.code !== 'EEXIST') throw err;
  });
}

export function getDataDir() {
  return path.join(__dirname, '..', 'data');
}
