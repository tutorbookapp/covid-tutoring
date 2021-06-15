import { ObjectWithObjectID, SearchResponse } from '@algolia/client-search';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { dequal } from 'dequal/lite';
import useTranslation from 'next-translate/useTranslation';

import Select, { SelectControllerProps } from 'components/select';

import { Option } from 'lib/model/query/base';

const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID as string;
const algoliaKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY as string;

const client = algoliasearch(algoliaId, algoliaKey);

type SearchHit = ObjectWithObjectID & {
  [key: string]: { name: string; synonyms: string[] };
};

/**
 * Orders the list of hits to match the order they were originally stored.
 * @param hits - The list of `SearchHits` to order.
 * @param langs - The list of locale codes that were stored in our database.
 * @return A list of `SearchHits` ordered according to the order in `langs`.
 */
function orderHits(hits: SearchHit[], langs: string[]): SearchHit[] {
  return hits.sort((first, second) => {
    const firstIdx = langs.findIndex((c) => c === first.objectID);
    const secondIdx = langs.findIndex((c) => c === second.objectID);
    return firstIdx - secondIdx;
  });
}

export type SearchSelectProps<T extends string> = SelectControllerProps<T> & {
  index: string;
  noResultsMessage: string;
  options?: T[];
};

export default function SearchSelect<T extends string>({
  index,
  value,
  onChange,
  selected,
  onSelectedChange,
  options,
  ...props
}: SearchSelectProps<T>): JSX.Element {
  // Store a cache of labels fetched (i.e. a map of values and labels).
  // TODO: Make sure this is globally stored and can be accessed across pages.
  const cache = useRef<Record<string, SearchHit>>({});
  const searchIdx = useMemo(() => client.initIndex(index), [index]);

  // Directly control the `Select` component with this internal state.
  const [selectedOptions, setSelectedOptions] = useState<Option<T>[]>(
    selected || []
  );
  const onSelectedOptionsChange = useCallback(
    (os: Option<T>[]) => {
      setSelectedOptions(os);
      if (onSelectedChange) onSelectedChange(os);
      if (onChange) onChange(os.map(({ value: val }) => val));
    },
    [onSelectedChange, onChange]
  );

  // Convert a search hit to an option (gets the label in the current language).
  const { lang: locale } = useTranslation();
  const hitToOption = useCallback(
    (hit: SearchHit) => {
      cache.current[hit.objectID] = hit;
      return { label: hit[locale].name, value: hit.objectID as T };
    },
    [locale]
  );

  // Searches the Algolia search index based on the user's `textarea` input.
  const getSuggestions = useCallback(
    async (query = '') => {
      const filters = options?.map((o) => `objectID:${o}`).join(' OR ');
      const res = await searchIdx.search<SearchHit>(query, { filters });
      return res.hits.map(hitToOption);
    },
    [searchIdx, hitToOption, options]
  );

  // Sync the controlled values (i.e. locale codes) with the internally stored
  // `selectedOptions` state **only** if they don't already match.
  useEffect(() => {
    setSelectedOptions((prev: Option<T>[]) => {
      // If they already match, do nothing.
      if (!value) return prev;
      if (!value.length) return [];
      if (
        dequal(
          prev.map((o) => o.value),
          value
        )
      )
        return prev;
      // Otherwise, fetch the correct labels (for those locale codes).
      const updateLabelsFromAlgolia = async () => {
        const res: SearchResponse<SearchHit> = await searchIdx.search('', {
          filters: value.map((val) => `objectID:${val}`).join(' OR '),
        });
        setSelectedOptions(orderHits(res.hits, value).map(hitToOption));
      };
      void updateLabelsFromAlgolia();
      // Then, temporarily update the options based on locale codes and cache.
      return value.map((id: T) => {
        if (cache.current[id]) return hitToOption(cache.current[id]);
        return { label: id, value: id };
      });
    });
  }, [searchIdx, value, hitToOption]);

  // Expose API surface to directly control the `selectedOptions` state.
  useEffect(() => {
    setSelectedOptions((prev: Option<T>[]) => {
      if (!selected || dequal(prev, selected)) return prev;
      return selected;
    });
  }, [selected]);

  // Don't allow selections not included in `options` prop.
  useEffect(() => {
    setSelectedOptions((prev: Option<T>[]) => {
      const os = prev.filter((s) => !options || options.includes(s.value));
      if (dequal(os, prev)) return prev;
      if (onSelectedChange) onSelectedChange(os);
      if (onChange) onChange(os.map(({ value: val }) => val));
      return os;
    });
  }, [options, onSelectedChange, onChange]);

  return (
    <Select
      {...props}
      value={selectedOptions}
      onChange={onSelectedOptionsChange}
      getSuggestions={getSuggestions}
    />
  );
}
