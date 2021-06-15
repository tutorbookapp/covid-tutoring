import { MenuSurface, MenuSurfaceAnchor } from '@rmwc/menu';
import { TextField, TextFieldHTMLProps, TextFieldProps } from '@rmwc/textfield';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MDCMenuSurfaceFoundation } from '@material/menu-surface';
import cn from 'classnames';
import { dequal } from 'dequal/lite';
import { nanoid } from 'nanoid';
import useSWR from 'swr';

import { CallbackParam, TCallback } from 'lib/model/callback';
import { ListMatchesRes } from 'lib/api/routes/matches/list';
import { Match } from 'lib/model/match';
import { MatchesQuery } from 'lib/model/query/matches';
import { useClickContext } from 'lib/hooks/click-outside';
import { useOrg } from 'lib/context/org';
import { useUser } from 'lib/context/user';

import MatchResult from './result';
import styles from './match-select.module.scss';

const HITS_PER_PG = 5;

interface Props {
  value?: Match;
  onChange: TCallback<Match | undefined>;
  renderToPortal?: boolean;
  focused?: boolean;
  onFocused?: () => any;
  onBlurred?: () => any;
  className?: string;
}

type Overrides =
  | keyof Props
  | 'textarea'
  | 'readOnly'
  | 'onFocus'
  | 'onBlur'
  | 'inputRef'
  | 'className';

export type MatchSelectProps = Omit<TextFieldHTMLProps, Overrides> &
  Omit<TextFieldProps, Overrides> &
  Props;

function MatchSelect({
  value,
  onChange,
  renderToPortal,
  focused,
  onFocused,
  onBlurred,
  className,
  ...textFieldProps
}: MatchSelectProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focused) inputRef.current?.focus();
  }, [focused]);

  // We use `setTimeout` and `clearTimeout` to wait a "tick" on a blur event
  // before toggling which ensures the user hasn't re-opened the menu.
  // @see {@link https://bit.ly/2x9eM27}
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const timeoutId = useRef<ReturnType<typeof setTimeout>>();

  const { updateEl, removeEl } = useClickContext();

  const elementId = useRef<string>(`match-select-${nanoid()}`);
  const menuSurfaceRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return removeEl(elementId.current);
      return updateEl(elementId.current, node);
    },
    [updateEl, removeEl]
  );

  const [searching, setSearching] = useState<boolean>(true);
  const [query, setQuery] = useState<MatchesQuery>();

  const onQueryChange = useCallback((param: CallbackParam<MatchesQuery>) => {
    setQuery((prev) => {
      let updated = prev || MatchesQuery.parse({ hitsPerPage: HITS_PER_PG });
      if (typeof param === 'object') updated = param;
      if (typeof param === 'function') updated = param(updated);
      if (dequal(updated, prev)) return prev;
      setSearching(true);
      return updated;
    });
  }, []);

  const { org } = useOrg();
  const { user } = useUser();
  const { data, error, isValidating } = useSWR<ListMatchesRes>(
    query ? query.endpoint : null
  );

  useEffect(() => {
    onQueryChange((prev) => {
      if (org) {
        if (!prev.people.length && prev.org === org.id) return prev;
        return MatchesQuery.parse({ ...prev, people: [], org: org.id });
      }
      if (!user.id) return prev;
      const people = [{ label: user.name, value: user.id }];
      return MatchesQuery.parse({ ...prev, people });
    });
  }, [org, user, onQueryChange]);

  useEffect(() => {
    setSearching((prev) => prev && (isValidating || !data));
  }, [isValidating, data]);

  const foundationRef = useRef<MDCMenuSurfaceFoundation>(null);
  useEffect(() => {
    (foundationRef.current as any)?.autoPosition_();
  });

  useEffect(() => {
    if (value) setMenuOpen(false);
  }, [value]);

  // Throttle API requests when text-based search changes (i.e. don't send a new
  // request for every letter changed in the text-based search).
  const [search, setSearch] = useState<string>('');
  useEffect(() => {
    setSearching(true);
    const searchTimeoutId = setTimeout(() => {
      setQuery((prev) => MatchesQuery.parse({ ...prev, search, page: 0 }));
    }, 500);
    return () => clearTimeout(searchTimeoutId);
  }, [search]);

  const loadingResults = useMemo(() => {
    const arr = Array(query?.hitsPerPage || HITS_PER_PG).fill(null);
    return arr.map(() => <MatchResult key={nanoid()} />);
  }, [query?.hitsPerPage]);

  return (
    <MenuSurfaceAnchor className={className}>
      <MenuSurface
        tabIndex={-1}
        open={menuOpen}
        ref={menuSurfaceRef}
        foundationRef={foundationRef}
        onFocus={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          inputRef.current?.focus();
        }}
        className={cn(styles.surface, {
          [styles.noResults]: !searching && !(data?.matches || []).length,
        })}
        anchorCorner='bottomStart'
        renderToPortal={renderToPortal ? '#portal' : false}
        data-cy='match-select-surface'
      >
        {!searching &&
          (data?.matches || []).map((match) => (
            <MatchResult
              key={match.id}
              match={Match.parse(match)}
              onClick={() => onChange(Match.parse(match))}
            />
          ))}
        {searching && loadingResults}
        {!searching && !(data?.matches || []).length && (
          <div className={styles.noResultsContent}>
            {error ? 'Errored, try again' : 'No matches'}
          </div>
        )}
      </MenuSurface>
      <TextField
        {...textFieldProps}
        placeholder='Search matches'
        value={value ? ' ' : '' || search}
        onChange={(evt) => setSearch(evt.currentTarget.value)}
        inputRef={inputRef}
        className={cn(styles.field, { [styles.hidden]: value })}
        onFocus={() => {
          if (onFocused) onFocused();
          if (timeoutId.current) {
            clearTimeout(timeoutId.current);
            timeoutId.current = undefined;
          }
          setMenuOpen(true);
        }}
        onBlur={() => {
          if (onBlurred) onBlurred();
          timeoutId.current = setTimeout(() => setMenuOpen(false), 0);
        }}
      >
        {value && (
          <MatchResult
            match={value}
            ripple={false}
            className={styles.valueDisplay}
            onClick={() => onChange(undefined)}
          />
        )}
      </TextField>
    </MenuSurfaceAnchor>
  );
}

export default memo(MatchSelect, dequal);
