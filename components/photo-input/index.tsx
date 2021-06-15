import { FormEvent, useEffect, useRef, useState } from 'react';
import { TextField, TextFieldHTMLProps, TextFieldProps } from '@rmwc/textfield';
import cn from 'classnames';
import { nanoid } from 'nanoid';
import { v4 as uuid } from 'uuid';

import { TCallback } from 'lib/model/callback';
import clone from 'lib/utils/clone';
import { useValidations } from 'lib/context/validations';

import styles from './photo-input.module.scss';

type TextFieldPropOverrides = 'helpText' | 'inputRef' | 'invalid';

interface UniquePhotoInputProps {
  value: string;
  onChange: TCallback<string>;
}

type Overrides = TextFieldPropOverrides | keyof UniquePhotoInputProps;

export type PhotoInputProps = Omit<TextFieldHTMLProps, Overrides> &
  Omit<TextFieldProps, Overrides> &
  UniquePhotoInputProps;

export default function PhotoInput({
  value,
  onChange,
  required,
  ...textFieldProps
}: PhotoInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.type = 'file';
      inputRef.current.accept = 'image/*';
      inputRef.current.style.display = 'none';
    }
  });

  const [helperValue, setHelperValue] = useState<string>(
    'Click the text field above to upload a photo.'
  );
  const [errored, setErrored] = useState<boolean>(false);
  const handleClick = (event: FormEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef.current) inputRef.current.click();
  };
  const handleChange = async (event: FormEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!event.currentTarget.files || !event.currentTarget.files.length) return;

    setErrored(false);

    const file: File = event.currentTarget.files[0];
    const lastDotIndex: number = file.name.lastIndexOf('.');
    const filename: string = file.name.substring(0, lastDotIndex);
    const extension: string = file.name.substring(lastDotIndex + 1);
    const pathname = `temp/${uuid()}.${extension}`;

    setHelperValue(`Uploading ${filename}.${extension}...`);

    const { default: firebase } = await import('lib/firebase');
    await import('firebase/storage');

    const ref = firebase.storage().ref(pathname);

    ref.put(file).on(firebase.storage.TaskEvent.STATE_CHANGED, {
      next() {}, // See https://github.com/firebase/firebase-js-sdk/issues/3158
      async complete() {
        onChange(await ref.getDownloadURL());
        setHelperValue(`Uploaded ${filename}.${extension}.`);
      },
      error(error: Error) {
        setErrored(true);
        setHelperValue(
          `An error occurred while uploading ${filename}.${extension}. ${error.message}`
        );
      },
    });
  };

  const { setValidations } = useValidations();
  useEffect(() => {
    const id = nanoid();
    setValidations((prev) => ({
      ...prev,
      [id]: () => {
        if (!required || value) return true;
        setHelperValue('Please click the text field above to upload a photo.');
        setErrored(true);
        // TODO: Right now, this merely mimics the default browser behavior.
        // Instead, we should implement smooth scrolling and ensure that it is
        // scrolled at least 64px from the top of the page (b/c of the header).
        inputRef.current?.parentElement?.scrollIntoView();
        return false;
      },
    }));
    return () =>
      setValidations((prev) => {
        const validations = clone(prev);
        delete validations[id];
        return validations;
      });
  }, [setValidations, value, required]);

  return (
    <TextField
      {...textFieldProps}
      helpText={{
        persistent: true,
        validationMsg: errored,
        children: helperValue,
      }}
      className={cn(textFieldProps.className, required && styles.required)}
      onChange={handleChange}
      inputRef={inputRef}
      invalid={errored}
      value=''
    >
      <button
        type='button'
        className={styles.clickArea}
        onClick={handleClick}
      />
    </TextField>
  );
}
