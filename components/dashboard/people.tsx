import useSWR from 'swr';

import {
  DataTable,
  DataTableContent,
  DataTableHead,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
} from '@rmwc/data-table';
import { Snackbar } from '@rmwc/snackbar';
import { TextField } from '@rmwc/textfield';
import { IconButton } from '@rmwc/icon-button';
import { ChipSet, Chip } from '@rmwc/chip';
import { Option, Query, Org, User, UserJSON, Tag } from 'lib/model';
import { IntercomAPI } from 'components/react-intercom';
import { defMsg, useMsg } from 'lib/intl';

import React from 'react';
import CreateUserDialog from 'components/create-user-dialog';
import VerificationDialog from 'components/verification-dialog';

import Title from './title';
import UserRow from './user-row';
import Placeholder from './placeholder';

import styles from './people.module.scss';

const msgs = defMsg({
  createUser: {
    id: 'people.actions.create-user',
    defaultMessage: 'Create user',
  },
  importData: {
    id: 'people.actions.import-data',
    defaultMessage: 'Import data',
  },
  shareSignupLink: {
    id: 'people.actions.share-signup-link',
    defaultMessage: 'Share signup link',
  },
  notVetted: {
    id: 'people.filters.not-vetted',
    defaultMessage: 'Not yet vetted',
  },
  visible: {
    id: 'people.filters.visible',
    defaultMessage: 'Visible in search',
  },
});

interface PeopleProps {
  people: UserJSON[];
  org: Org;
}

export default function People({ people, org }: PeopleProps): JSX.Element {
  const msg = useMsg();
  const [query, setQuery] = React.useState<Query>(
    new Query({
      orgs: [{ label: org.name, value: org.id }],
    })
  );
  const { data: users, mutate } = useSWR<UserJSON[]>(query.endpoint, {
    initialData: people,
  });

  const [selected, setSelected] = React.useState<string[]>([]);
  const [viewing, setViewing] = React.useState<User | undefined>();
  const [viewingSnackbar, setViewingSnackbar] = React.useState<boolean>(false);
  const [viewingCreateUserDialog, setViewingCreateUserDialog] = React.useState<
    boolean
  >(false);

  return (
    <>
      {viewing && (
        <VerificationDialog
          mutate={mutate}
          user={viewing}
          onClosed={() => setViewing(undefined)}
        />
      )}
      {viewingCreateUserDialog && (
        <CreateUserDialog onClosed={() => setViewingCreateUserDialog(false)} />
      )}
      {viewingSnackbar && (
        <Snackbar
          open={viewingSnackbar}
          className={styles.snackbar}
          onClose={() => setViewingSnackbar(false)}
          message='Link copied to clipboard.'
          dismissIcon
          leading
        />
      )}
      <Title
        header='People'
        body={`${org.name}'s tutors, mentors and students`}
        actions={[
          {
            label: msg(msgs.createUser),
            onClick: () => setViewingCreateUserDialog(true),
          },
          {
            label: msg(msgs.importData),
            onClick: () =>
              IntercomAPI('showNewMessage', "I'd like to import data."),
          },
          {
            label: msg(msgs.shareSignupLink),
            onClick: () => setViewingSnackbar(true),
          },
        ]}
      />
      <div className={styles.wrapper}>
        <div className={styles.filters}>
          <div className={styles.left}>
            <IconButton className={styles.filtersButton} icon='filter_list' />
            <ChipSet>
              <Chip
                label={msg(msgs.notVetted)}
                checkmark
                onInteraction={() => {
                  const tags: Option<Tag>[] = Array.from(query.tags);
                  const idx = tags.findIndex(
                    ({ value }) => value === 'not-vetted'
                  );
                  if (idx < 0) {
                    tags.push({
                      label: msg(msgs.notVetted),
                      value: 'not-vetted',
                    });
                  } else {
                    tags.splice(idx, 1);
                  }
                  setQuery(new Query({ ...query, tags }));
                }}
                selected={
                  query.tags.findIndex(({ value }) => value === 'not-vetted') >=
                  0
                }
              />
              <Chip
                label={msg(msgs.visible)}
                checkmark
                onInteraction={() =>
                  setQuery(new Query({ ...query, visible: !query.visible }))
                }
                selected={query.visible}
              />
            </ChipSet>
          </div>
          <div className={styles.right}>
            <TextField
              outlined
              placeholder='Search'
              className={styles.searchField}
            />
            <IconButton className={styles.menuButton} icon='more_vert' />
          </div>
        </div>
        {!!users && !!users.length && (
          <DataTable className={styles.table}>
            <DataTableContent>
              <DataTableHead className={styles.header}>
                <DataTableRow>
                  <DataTableHeadCell />
                  <DataTableHeadCell className={styles.sticky}>
                    Name
                  </DataTableHeadCell>
                  <DataTableHeadCell>Bio</DataTableHeadCell>
                  <DataTableHeadCell>Email</DataTableHeadCell>
                  <DataTableHeadCell>Phone</DataTableHeadCell>
                  <DataTableHeadCell>Tutoring Subjects</DataTableHeadCell>
                  <DataTableHeadCell>Mentoring Subjects</DataTableHeadCell>
                  <DataTableHeadCell>Visible</DataTableHeadCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {users.map((user: UserJSON) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    mutate={mutate}
                    onClick={() => setViewing(User.fromJSON(user))}
                    selected={selected.indexOf(user.id) >= 0}
                    setSelected={() => {
                      const idx = selected.indexOf(user.id);
                      if (idx < 0) {
                        setSelected([...selected, user.id]);
                      } else {
                        const copy: string[] = Array.from(selected);
                        copy.splice(idx, 1);
                        setSelected(copy);
                      }
                    }}
                  />
                ))}
              </DataTableBody>
            </DataTableContent>
          </DataTable>
        )}
        {(!users || !users.length) && (
          <div className={styles.empty}>
            <Placeholder>NO PEOPLE TO SHOW</Placeholder>
          </div>
        )}
      </div>
    </>
  );
}