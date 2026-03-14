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

  // Prebuild actions
  nlp.registerActionFunction('setContext', async (data, key, value) => {
    console.log("SET CONTEXT!", key, value);
    data.context[key] = value;
    return data;
  });

  nlp.registerActionFunction('increment', async (data, key) => {
    const current = data.context[key] || 0;
    data.context[key] = Number(current) + 1;
    return data;
  });

  nlp.registerActionFunction('clearContext', async (data) => {
    data.context = {};
    return data;
  });

  // Only add corpus if it has data to avoid errors
  if (corpus && corpus.data && corpus.data.length > 0) {
    await nlp.addCorpus(corpus);
  }

  nlp.forceNER = true;
  await nlp.train();
  return nlp;
}
