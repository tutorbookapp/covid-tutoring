import { useMemo } from 'react';
import useTranslation from 'next-translate/useTranslation';

import SearchSelect, { SearchSelectProps } from 'components/search-select';

import { MatchHitTag, MatchTag } from 'lib/model';
import { MeetingHitTag, MeetingTag } from 'lib/model';
import { UserHitTag, UserTag } from 'lib/model';

export type TagSelectProps<
  HitTag extends UserHitTag | MatchHitTag | MeetingHitTag,
  Tag extends UserTag | MatchTag | MeetingTag
> = Omit<
  SearchSelectProps<HitTag>,
  'index' | 'noResultsMessage' | 'options' | 'ref'
> & { options: Tag[] };

// TODO: We can't yet use TypeScript generics *and* `React.memo` so this
// component is going to be left un-optimized for now.
// @see {@link https://github.com/facebook/react/issues/21003}
export default function TagSelect<
  HitTag extends UserHitTag | MatchHitTag | MeetingHitTag,
  Tag extends UserTag | MatchTag | MeetingTag
>({ options, ...props }: TagSelectProps<HitTag, Tag>): JSX.Element {
  const { t } = useTranslation();

  // TODO: TypeScript should know that if HitTag is UserHitTag then Tag has to
  // be UserTag (and cannot be MatchTag or MeetingTag) and vice versa.
  const selectOptions = useMemo(
    () => [
      ...((options as unknown) as HitTag[]),
      ...options.map((o) => `not-${o}` as HitTag),
    ],
    [options]
  );

  return (
    <SearchSelect
      {...props}
      noResultsMessage={t('common:no-tags')}
      options={selectOptions}
      autoOpenMenu
      index='tags'
    />
  );
}
