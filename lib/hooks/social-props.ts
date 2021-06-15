import { FormEvent, useCallback } from 'react';
import { TextFieldHTMLProps, TextFieldProps } from '@rmwc/textfield';
import useTranslation from 'next-translate/useTranslation';

import { Account, SocialInterface, SocialTypeAlias } from 'lib/model/account';
import { Callback } from 'lib/model/callback';
import { Constructor } from 'lib/model/resource';

function getPlaceholder(type: SocialTypeAlias, username: string): string {
  switch (type) {
    case 'website':
      return `https://${username}.com`;
    case 'linkedin':
      return `https://linkedin.com/in/${username}`;
    default:
      return `https://${type}.com/${username}`;
  }
}

export default function useSocialProps<T extends Account>(
  data: T,
  setData: Callback<T>,
  className: string,
  labelKey: string,
  Model: Constructor<T>
): (type: SocialTypeAlias) => TextFieldProps & TextFieldHTMLProps {
  const { t } = useTranslation();

  return useCallback(
    (type: SocialTypeAlias) => {
      const idx = data.socials.findIndex((s) => s.type === type);
      const value = idx >= 0 ? data.socials[idx].url : '';

      function updateSocial(url: string): void {
        const updated: SocialInterface[] = Array.from(data.socials);
        if (idx >= 0) {
          updated[idx] = { type, url };
        } else {
          updated.push({ type, url });
        }
        setData((prev: T) => new Model({ ...prev, socials: updated }));
      }

      return {
        value,
        className,
        outlined: true,
        label: t(`${labelKey}:${type}`),
        onFocus: () => {
          const username = (data.name || '').split(' ').join('').toLowerCase();
          if (idx < 0) updateSocial(getPlaceholder(type, username));
        },
        onChange: (evt: FormEvent<HTMLInputElement>) => {
          updateSocial(evt.currentTarget.value);
        },
      };
    },
    [data.name, data.socials, setData, className, labelKey, t, Model]
  );
}
