import { dockStart } from '@nlpjs/basic';
const SETTINGS = 
{
  settings: {
    nlp: {
      corpora: [
      ]
    }
  },
  use: ["Basic"]
}

/**
 * Create an NLP instance from a custom corpus file
 * @param {string} corpusPath - Path to the JSON corpus file
 * @param {string} locale - Language locale (default: 'en')
 * @returns {Promise<object>} NLP manager instance
 */
export async function createNlp(corpus, locale = 'en') {
  const dock = await dockStart(SETTINGS);
  const nlp = dock.get('nlp');
  await nlp.addCorpus(corpus);
  await nlp.train();
  return nlp;
}
