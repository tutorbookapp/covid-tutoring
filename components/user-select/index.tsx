import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { dequal } from 'dequal/lite';
import useTranslation from 'next-translate/useTranslation';

import Select, { SelectControllerProps } from 'components/select';

import { User, UserJSON } from 'lib/model/user';
import { ListUsersRes } from 'lib/api/routes/users/list';
import { Option } from 'lib/model/query/base';
import { UsersQuery } from 'lib/model/query/users';
import { useUser } from 'lib/context/user';

export interface UserOption extends Option {
  photo?: string;
}

/**
 * Each `Option` object's label is the user's name and value is the user's uID.
 * We use a `Query` object and call the `/api/users` API endpoint to get
 * suggestions. We concurrently call the `/api/users/[id]` API endpoint to get
 * the labels (i.e. the user names) for the initial `value`.
 *
 * Other than those changes, this is implemented essentially the same way as the
 * `SubjectSelect` or the `LangSelect` (as a wrapper around a `Select`).
 */
export default function UserSelect({
  value,
  onChange,
  selected,
  onSelectedChange,
  ...props
}: SelectControllerProps<UserOption>): JSX.Element {
  // Only show users that are either:
  // a) Within one of the orgs that the current user is an admin of.
  // b) A child of the current user.
  const { user, orgs } = useUser();

  // Store a cache of labels fetched (i.e. a map of values and labels).
  const cache = useRef<Record<string, { name: string; photo: string }>>({});

  // Directly control the `Select` component (just like the `SubjectSelect`).
  const [selectedOptions, setSelectedOptions] = useState<UserOption[]>(
    selected || []
  );
  const onSelectedOptionsChange = useCallback(
    (os: UserOption[]) => {
      setSelectedOptions(os);
      if (onSelectedChange) onSelectedChange(os);
      if (onChange) onChange(os.map(({ value: val }) => val));
    },
    [onSelectedChange, onChange]
  );

  // Call the `/api/users` API endpoint to get suggestions.
  const userToOption = useCallback((u: User | UserJSON) => {
    cache.current[u.id] = { name: u.name, photo: u.photo };
    return { value: u.id, label: u.name, photo: u.photo };
  }, []);
  const getSuggestions = useCallback(
    async (search: string = '') => {
      const promises: Promise<{ data: ListUsersRes }>[] = [];
      if (orgs.length)
        promises.push(
          axios.get<ListUsersRes>(
            UsersQuery.parse({ search, orgs: orgs.map((o) => o.id) }).endpoint
          )
        );
      if (user.id)
        promises.push(
          axios.get<ListUsersRes>(
            UsersQuery.parse({ search, parents: [user.id] }).endpoint
          )
        );
      const suggestions: UserOption[] = [];
      (await Promise.all(promises)).forEach(({ data }) => {
        data.users.forEach((u: UserJSON) => {
          if (suggestions.findIndex(({ value: id }) => id === u.id) < 0)
            suggestions.push(userToOption(u));
        });
      });
      return suggestions;
    },
    [userToOption, orgs, user]
  );

  // Sync the controlled values (i.e. subject codes) with the internally stored
  // `selectedOptions` state **only** if they don't already match.
  useEffect(() => {
    setSelectedOptions((prev: UserOption[]) => {
      // If they already match, do nothing.
      if (!value) return prev;
      if (
        dequal(
          prev.map(({ value: val }) => val),
          value
        )
      )
        return prev;
      // Otherwise, fetch the correct labels (i.e. the users's names) by
      // concurrently calling the `/api/users/[id]` for each `value`.
      const updateLabels = async () => {
        const users: UserJSON[] = await Promise.all(
          value.map(async (id) => {
            const { data } = await axios.get<UserJSON>(`/api/users/${id}`);
            return data;
          })
        );
        setSelectedOptions(users.map(userToOption));
      };
      void updateLabels();
      // Then, temporarily update the options based on the IDs and cache.
      return value.map((id) => ({
        label: cache.current[id] ? cache.current[id].name : id,
        photo: cache.current[id] ? cache.current[id].photo : '',
        value: id,
      }));
    });
  }, [value, userToOption]);

  // Expose API surface to directly control the `selectedOptions` state.
  useEffect(() => {
    setSelectedOptions((prev: UserOption[]) => {
      if (!selected || dequal(prev, selected)) return prev;
      return selected;
    });
  }, [selected]);

  const { t } = useTranslation();

  return (
    <Select
      {...props}
      value={selectedOptions}
      onChange={onSelectedOptionsChange}
      getSuggestions={getSuggestions}
      noResultsMessage={t('common:no-users')}
    />
  );
}
