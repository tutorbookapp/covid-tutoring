import { TextField, TextFieldHTMLProps, TextFieldProps } from '@rmwc/textfield';
import useTranslation from 'next-translate/useTranslation';

import { TCallback } from 'lib/model/callback';

type TextFieldPropOverrides = 'helpText' | 'placeholder';

interface UniqueVenueInputProps {
  name?: string;
  value: string;
  onChange: TCallback<string>;
}

type Overrides = TextFieldPropOverrides | keyof UniqueVenueInputProps;

export type VenueInputProps = Omit<TextFieldHTMLProps, Overrides> &
  Omit<TextFieldProps, Overrides> &
  UniqueVenueInputProps;

export default function VenueInput({
  name,
  value,
  onChange,
  ...textFieldProps
}: VenueInputProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <TextField
      {...textFieldProps}
      placeholder={t('common:venue-placeholder')}
      helpText={{
        persistent: true,
        children: t('common:venue-help-text', {
          name: name ? `${name}'s` : 'your',
        }),
      }}
      onChange={(evt) => onChange(evt.currentTarget.value)}
      value={value}
    />
  );
}
