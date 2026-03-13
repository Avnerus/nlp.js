import { dock } from '@nlpjs/basic';

/**
 * Create an NLP instance from a custom corpus object
 * @param {object} corpus - Corpus object with name, locale, data, entities
 * @param {string} locale - Language locale (default: 'en')
 * @returns {Promise<object>} NLP manager instance
 */
export async function createNlp(corpus, locale = 'en') {
  const uniqueName = `${Date.now()}`;
  const SETTINGS = {
    settings: {
      nlp: {
        corpora: [],
      },
    },
    use: ['Basic'],
  };

  const container = await dock.createContainer(uniqueName, SETTINGS, false);
  const nlp = container.get('nlp');

  // Only add corpus if it has data to avoid errors
  if (corpus && corpus.data && corpus.data.length > 0) {
    await nlp.addCorpus(corpus);
  }

  nlp.forceNER = true;
  await nlp.train();
  return nlp;
}
