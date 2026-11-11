import { en } from './messages/en';
import { createTranslator } from './translate';

/** Static English translator — a default for code that can run outside the app (unit tests). */
export const translateEnglish = createTranslator(
  () => en,
  () => 'en-US',
);
