import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createNlp } from '../src/nlp-engine.js';

describe('NLP Engine Tests', () => {
  let nlp;

  const testCorpus = {
    name: 'Test Corpus',
    locale: 'en-US',
    data: [
      {
        intent: 'greetings.hello',
        utterances: ['hello', 'hi', 'hey'],
        answers: ['Hello there!', 'Hi!', 'Greetings!'],
      },
      {
        intent: 'greetings.bye',
        utterances: ['goodbye', 'bye', 'see you'],
        answers: ['Goodbye!', 'See you later!', 'Bye!'],
      },
      {
        intent: 'agent.introduction',
        utterances: ['who are you', 'what are you', 'tell me about yourself'],
        answers: ['I am a virtual agent', 'I am a conversational app'],
      },
    ],
  };

  beforeAll(async () => {
    nlp = await createNlp(testCorpus, 'en');
  }, 10000);

  afterAll(async () => {
    // Cleanup if needed
  }, 10000);

  it('should create NLP instance', async () => {
    expect(nlp).toBeDefined();
    expect(typeof nlp.process).toBe('function');
  }, 15000);

  it('should recognize hello intent', async () => {
    const result = await nlp.process('en', 'hello');
    expect(result).toBeDefined();
    expect(result.intent).toBe('greetings.hello');
    expect(result.score).toBeGreaterThan(0);
  }, 5000);

  it('should recognize hi intent (synonym)', async () => {
    const result = await nlp.process('en', 'hi');
    expect(result.intent).toBe('greetings.hello');
  }, 5000);

  it('should recognize goodbye intent', async () => {
    const result = await nlp.process('en', 'goodbye');
    expect(result.intent).toBe('greetings.bye');
  }, 5000);

  it('should recognize bye intent (synonym)', async () => {
    const result = await nlp.process('en', 'bye');
    expect(result.intent).toBe('greetings.bye');
  }, 5000);

  it('should recognize agent introduction intent', async () => {
    const result = await nlp.process('en', 'who are you');
    expect(result.intent).toBe('agent.introduction');
  }, 5000);

  it('should return answer for recognized intent', async () => {
    const result = await nlp.process('en', 'hello');
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
    expect(['Hello there!', 'Hi!', 'Greetings!']).toContain(result.answer);
  }, 5000);

  it('should handle unknown intent', async () => {
    const result = await nlp.process('en', 'something completely random');
    // NLP should still return a result, possibly with low confidence
    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
  }, 5000);

  it('should handle empty corpus gracefully', async () => {
    const emptyNlp = await createNlp({ name: 'Empty', locale: 'en-US' }, 'en');
    const result = await emptyNlp.process('en', 'hello');
    expect(result).toBeDefined();
  }, 10000);
});
