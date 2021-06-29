// A reusable function that sanitizes a list of subjects, ensuring that each of
// the subjects is included in our subject CSV files (which are then included in
// our subject Algolia indices that power the `SubjectSelect` components).
//
// TODO: Rewrite this to be more general or just get rid of it.

const fs = require('fs');
const prompt = require('prompt-sync')();

const SUBJECT_TO_LANG_DICT = {
  Latin: 'la',
  Spanish: 'es',
  Chinese: 'zh',
  Urdu: 'ur',
  Hindi: 'hi',
  Japanese: 'ja',
  French: 'fr',
  German: 'de',
};
const GRADES = [
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
  '5th Grade',
  '6th Grade',
  '7th Grade',
  '8th Grade',
  '9th Grade',
  '10th Grade',
  '11th Grade',
  '12th Grade',
];

const SUBJECT_LEVELS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const PREFIXES = [...GRADES, 'AP', 'Elementary', 'General'];
const SUFFIXES = [
  ...SUBJECT_LEVELS,
  ...SUBJECT_LEVELS.map((l) => `${l}A`),
  'Language',
  'A',
  'H',
];

const cache = require('./cache.json');
const updateSubjects = (subjects, validSubjects) => {
  const all = new Set(
    subjects
      .filter((subject) => !!subject)
      .map((subject) => {
        const idx = validSubjects.findIndex((s) => {
          const synonyms = s.synonyms.split(', ');
          const valid = (name) => s.name === name || synonyms.includes(name);
          if (valid(subject)) return true;
          for (const prefix of PREFIXES) {
            if (valid(subject.replace(`${prefix} `, ''))) return true;
            if (valid(`${prefix} ${subject}`)) return true;
          }
          for (const suffix of SUFFIXES) {
            if (valid(subject.replace(` ${suffix}`, ''))) return true;
            if (valid(`${subject} ${suffix}`)) return true;
          }
          return false;
        });
        if (idx < 0 && cache[subject] === undefined) {
          const validSubjectNames = validSubjects.map((s) => s.name);
          cache[subject] = prompt(`What subject is "${subject}"? `).split(', ');
          while (cache[subject].some((s) => !validSubjectNames.includes(s)))
            cache[subject] = prompt(`What subject is "${subject}"? `).split(
              ', '
            );
        }
        return idx >= 0 ? [validSubjects[idx].name] : cache[subject];
      })
      .flat()
  );
  fs.writeFileSync('./cache.json', JSON.stringify(cache, null, 2));
  return [...all].filter((s) => !!s);
};

module.exports = updateSubjects;
