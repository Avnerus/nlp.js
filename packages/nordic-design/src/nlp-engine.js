const { dockStart } = require('@nlpjs/basic');

/**
 * Create an NLP instance from a custom corpus file
 * @param {string} corpusPath - Path to the JSON corpus file
 * @param {string} locale - Language locale (default: 'en')
 * @returns {Promise<object>} NLP manager instance
 */
async function createNlp(corpusPath, locale = 'en') {
  const dock = await dockStart();
  const nlp = dock.get('nlp');
  
  // Load corpus file
  const corpus = require(corpusPath);
  
  // Add intents and answers from corpus
  for (const item of corpus.data) {
    const { intent, utterances, answers } = item;
    
    // Add utterances for this intent
    for (const utterance of utterances) {
      nlp.addDocument(locale, utterance, intent);
    }
    
    // Add answers for this intent
    if (Array.isArray(answers)) {
      for (const answerObj of answers) {
        // Handle both simple string answers and conditional answers
        const answer = typeof answerObj === 'string' ? answerObj : answerObj.answer;
        nlp.addAnswer(locale, intent, answer);
      }
    }
  }
  
  await nlp.train();
  return nlp;
}

module.exports = { createNlp };
