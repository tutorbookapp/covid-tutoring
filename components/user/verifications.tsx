import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableContent,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from '@rmwc/data-table';
import { FormEvent, useCallback, useMemo } from 'react';
import { Snackbar, SnackbarAction } from '@rmwc/snackbar';
import { Checkbox } from '@rmwc/checkbox';
import { Switch } from '@rmwc/switch';
import { TextField } from '@rmwc/textfield';
import axios from 'axios';
import { mutate } from 'swr';
import useTranslation from 'next-translate/useTranslation';

import { Check, Verification } from 'lib/model';
import { User, UserJSON } from 'lib/model';
import { Aspect } from 'lib/model';
import clone from 'lib/utils/clone';
import useContinuous from 'lib/hooks/continuous';
import { useUser } from 'lib/context/user';

import styles from './verifications.module.scss';

const checks: Check[] = [
  'background-check',
  'email',
  'academic-email',
  'training',
  'interview',
];

export interface VerificationsTableProps {
  user: User;
}

export default function VerificationsTable({
  user: initialData,
}: VerificationsTableProps): JSX.Element {
  const { t } = useTranslation();
  const { orgs, user: currentUser } = useUser();

  const updateRemote = useCallback(async (updated: User) => {
    const url = `/api/users/${updated.id}`;
    const { data } = await axios.put<UserJSON>(url, updated.toJSON());
    return User.fromJSON(data);
  }, []);
  const updateLocal = useCallback(async (updated: User) => {
    await mutate(`/api/users/${updated.id}`, updated.toJSON(), false);
  }, []);

  const {
    data: user,
    setData: setUser,
    loading,
    checked,
    error,
    retry,
    timeout,
  } = useContinuous(initialData, updateRemote, updateLocal);

  const org = useMemo(() => {
    const idx = orgs.findIndex((o) => user.orgs.includes(o.id));
    if (idx < 0) return 'default';
    return orgs[idx].id;
  }, [orgs, user.orgs]);

  const getChecked = useCallback(
    (c: Check) => user.verifications.some((v) => v.checks.includes(c)),
    [user.verifications]
  );
  const setChecked = useCallback(
    (evt: FormEvent<HTMLInputElement>, c: Check) => {
      const enabled = evt.currentTarget.checked;
      return setUser((prev) => {
        const verifications = clone(prev.verifications).map(
          (v) => Verification.parse(v)
        );
        const idx = verifications.findIndex((v) => v.checks.includes(c));
        if (idx < 0 && enabled) {
          verifications.push(
            Verification.parse({
              org,
              notes: '',
              checks: [c],
              user: currentUser.id,
              created: new Date(),
              updated: new Date(),
            })
          );
        } else if (idx >= 0 && !enabled) {
          verifications.splice(idx, 1);
        }
        return User.parse({ ...prev, verifications });
      });
    },
    [currentUser.id, org, setUser]
  );

  const someChecked = useMemo(() => user.verifications.length > 0, [
    user.verifications,
  ]);
  const allChecked = useMemo(
    () =>
      checks.every((c) => user.verifications.some((v) => v.checks.includes(c))),
    [user.verifications]
  );

  const toggleAll = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const enabled = evt.currentTarget.checked;
      return setUser((prev) => {
        if (!enabled) return User.parse({ ...prev, verifications: [] });
        const verifications = clone(prev.verifications).map(
          (v) => Verification.parse(v)
        );
        const isChecked = verifications.reduce(
          (a, c) => a.concat(c.checks),
          [] as Check[]
        );
        const notChecked = checks.filter((c) => !isChecked.includes(c));
        notChecked.forEach((check) =>
          verifications.push(
            Verification.parse({
              org,
              notes: '',
              checks: [check],
              user: currentUser.id,
              created: new Date(),
              updated: new Date(),
            })
          )
        );
        return User.parse({ ...prev, verifications });
      });
    },
    [currentUser.id, org, setUser]
  );

  const getValue = useCallback(
    (c: Check) => {
      const idx = user.verifications.findIndex((v) => v.checks.includes(c));
      if (idx < 0) return '';
      return user.verifications[idx].notes;
    },
    [user.verifications]
  );
  const setValue = useCallback(
    (evt: FormEvent<HTMLInputElement>, c: Check) => {
      const { value: notes } = evt.currentTarget;
      return setUser((prev) => {
        const verifications = clone(prev.verifications).map(
          (v) => Verification.parse(v)
        );
        const idx = verifications.findIndex((v) => v.checks.includes(c));
        if (idx < 0) {
          verifications.push(
            Verification.parse({
              org,
              notes,
              checks: [c],
              user: currentUser.id,
              created: new Date(),
              updated: new Date(),
            })
          );
        } else {
          verifications[idx].notes = notes;
          verifications[idx].updated = new Date();
        }
        return User.parse({ ...prev, verifications });
      });
    },
    [currentUser.id, org, setUser]
  );

  const onVisibilityChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const visible = evt.currentTarget.checked;
      return setUser((prev) => User.parse({ ...prev, visible }));
    },
    [setUser]
  );

  const onFeaturedChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const isFeatured = evt.currentTarget.checked;
      return setUser((prev) => {
        const featured: Aspect[] = [];
        if (!isFeatured) return User.parse({ ...prev, featured });
        if (prev.tutoring.subjects.length) featured.push('tutoring');
        if (prev.mentoring.subjects.length) featured.push('mentoring');
        return User.parse({ ...prev, featured });
      });
    },
    [setUser]
  );

  return (
    <>
      {loading && (
        <Snackbar message={t('user:loading')} timeout={-1} leading open />
      )}
      {checked && <Snackbar message={t('user:checked')} leading open />}
      {error && (
        <Snackbar
          message={t('user:error', { count: timeout / 1000 })}
          timeout={-1}
          action={<SnackbarAction label={t('common:retry')} onClick={retry} />}
          leading
          open
        />
      )}
      <DataTable className={styles.table}>
        <DataTableContent>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeadCell className={styles.checkbox} hasFormControl>
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked && !allChecked}
                  onChange={toggleAll}
                />
              </DataTableHeadCell>
              <DataTableHeadCell className={styles.check}>
                {t('user:verification-description')}
              </DataTableHeadCell>
              <DataTableHeadCell className={styles.notes}>
                {t('user:verification-notes')}
              </DataTableHeadCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {checks.map((check: Check) => (
              <DataTableRow key={check}>
                <DataTableCell className={styles.checkbox} hasFormControl>
                  <Checkbox
                    checked={getChecked(check)}
                    onChange={(event: FormEvent<HTMLInputElement>) =>
                      setChecked(event, check)
                    }
                  />
                </DataTableCell>
                <DataTableCell className={styles.check}>
                  {t(`user:verification-${check}`)}
                </DataTableCell>
                <DataTableCell className={styles.notes}>
                  <TextField
                    value={getValue(check)}
                    onChange={(event: FormEvent<HTMLInputElement>) =>
                      setValue(event, check)
                    }
                    className={styles.field}
                  />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTableContent>
      </DataTable>
      <Switch
        className={styles.switch}
        label={t('user:visible')}
        checked={user.visible}
        onChange={onVisibilityChange}
      />
      <Switch
        className={styles.switch}
        label={t('user:featured')}
        checked={!!user.featured.length}
        onChange={onFeaturedChange}
        disabled={
          !user.tutoring.subjects.length && !user.mentoring.subjects.length
        }
      />
    </>
  );
}
