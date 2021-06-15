import { ObjectWithObjectID, SearchResponse } from '@algolia/client-search';
import algoliasearch from 'algoliasearch/lite';

import { Option } from 'lib/model/query/base';

const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string;
const algoliaKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY as string;

const client = algoliasearch(algoliaId, algoliaKey);
const searchIndex = client.initIndex('langs');

type LangHit = ObjectWithObjectID & {
  [key: string]: { name: string; synonyms: string[] };
};

/**
 * Converts a given array of locale codes into an array of `Option<string>`
 * that include the language's label (i.e. `en` -> `English`) by fetching the
 * labels from our Algolia search index.
 */
export async function langsToOptions(
  langs: string[],
  locale = 'en'
): Promise<Option[]> {
  if (!langs.length) return [];
  const res: SearchResponse<LangHit> = await searchIndex.search('', {
    filters: langs.map((lang: string) => `objectID:${lang}`).join(' OR '),
  });
  return res.hits.map((lang: LangHit) => ({
    label: lang[locale].name,
    value: lang.objectID,
  }));
}

/**
 * Converts an array of subject codes into their `Option<string>` values by
 * fetching their labels from our Algolia search index.
 * @todo Actually add i18n to subjects.
 */
export async function subjectsToOptions(
  subjects: string[],
  locale = 'en'
): Promise<Option[]> {
  return subjects.map((subject) => ({ label: subject, value: subject }));
}

export async function getSubjectLabels(
  subjects: string[],
  locale = 'en'
): Promise<string[]> {
  return (await subjectsToOptions(subjects, locale)).map((o) => o.label);
}

export async function getLangLabels(
  langs: string[],
  locale = 'en'
): Promise<string[]> {
  return (await langsToOptions(langs, locale)).map((o) => o.label);
}
