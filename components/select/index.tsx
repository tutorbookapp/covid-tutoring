import {
  FormEvent,
  MouseEvent,
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MenuSurface, MenuSurfaceAnchor } from '@rmwc/menu';
import { TextField, TextFieldHTMLProps, TextFieldProps } from '@rmwc/textfield';
import { Chip } from '@rmwc/chip';
import { MDCMenuSurfaceFoundation } from '@material/menu-surface';
import { nanoid } from 'nanoid';
import to from 'await-to-js';

import CloseIcon from 'components/icons/close';

import { Option } from 'lib/model/query/base';
import { TCallback } from 'lib/model/callback';
import { useClickContext } from 'lib/hooks/click-outside';
import usePrevious from 'lib/hooks/previous';

import SelectHint from './select-hint';
import SelectSurface from './select-surface';
import styles from './select.module.scss';

type TextFieldPropOverrides = 'textarea' | 'onFocus' | 'onBlur';

interface UniqueSelectProps<O extends Option = Option> {
  value: O[];
  onChange: TCallback<O[]>;
  getSuggestions: (query: string) => Promise<O[]>;
  forceUpdateSuggestions?: boolean;
  noResultsMessage: string;
  renderToPortal?: boolean;
  autoOpenMenu?: boolean;
  singleLine?: boolean;
  focused?: boolean;
  onFocused?: () => any;
  onBlurred?: () => any;
}

type Overrides<O extends Option = Option> =
  | TextFieldPropOverrides
  | keyof UniqueSelectProps<O>;

export type SelectProps<O extends Option = Option> = Omit<
  TextFieldHTMLProps,
  Overrides<O>
> &
  Omit<TextFieldProps, Overrides<O>> &
  UniqueSelectProps<O>;

/**
 * Each `Select` component provides a wrapper around the base `Select`
 * component (defined in this file). Those wrappers:
 * 1. Provide a surface on which to control the values selected.
 * 2. Syncs those values with internally stored `Option[]` state by querying our
 * Algolia search indices.
 * 3. Also exposes that `Option[]` state if needed by the parent component.
 */
export interface SelectControls<O extends Option = Option> {
  value: string[];
  onChange: (value: string[]) => void;
  selected: O[];
  onSelectedChange: (options: O[]) => void;
}

export type SelectControllerProps<O extends Option = Option> = Omit<
  SelectProps<O>,
  | keyof SelectControls<O>
  | 'getSuggestions'
  | 'noResultsMessage'
  | 'forceUpdateSuggestions'
> &
  Partial<SelectControls<O>>;

export default function Select<O extends Option>({
  value,
  onChange,
  getSuggestions,
  forceUpdateSuggestions = false,
  noResultsMessage,
  renderToPortal = false,
  autoOpenMenu = false,
  singleLine = false,
  focused = false,
  onFocused = () => {},
  onBlurred = () => {},
  className,
  ...textFieldProps
}: SelectProps<O>): JSX.Element {
  const suggestionsTimeoutId = useRef<ReturnType<typeof setTimeout>>();
  const foundationRef = useRef<MDCMenuSurfaceFoundation>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ghostElementRef = useRef<HTMLSpanElement>(null);
  const lastSelectedRef = useRef<Option>();
  const textareaBreakWidth = useRef<number>();
  const hasOpenedSuggestions = useRef<boolean>(false);

  const [suggestionsOpen, setSuggestionsOpen] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<O[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [lineBreak, setLineBreak] = useState<boolean>(false);
  const [errored, setErrored] = useState<boolean>(false);

  const updateSuggestions = useCallback(
    async (search = '') => {
      const [err, options] = await to<O[]>(getSuggestions(search));
      if (err) {
        setSuggestions([]);
        setErrored(true);
      } else {
        setSuggestions(options as O[]);
        setErrored(false);
      }
    },
    [getSuggestions]
  );

  useEffect(() => {
    void updateSuggestions();
  }, [updateSuggestions]);

  /**
   * The `TextField`'s label should float if any of the following is true:
   * - The `TextField`'s value isn't empty.
   * - The `TextField` is focused.
   * - There are options selected (this is the only thing that's custom).
   *
   * Make sure to float the `TextField`'s label if there are options selected.
   * @see {@link https://github.com/jamesmfriedman/rmwc/issues/601}
   * @see {@link https://github.com/tutorbookapp/covid-tutoring/issues/8}
   */
  const emptyInputValue = useMemo(() => (value.length > 0 ? ' ' : ''), [value]);
  useEffect(() => {
    const isEmpty = inputValue === '' || inputValue === ' ';
    if (isEmpty && inputValue !== emptyInputValue)
      setInputValue(emptyInputValue);
  }, [inputValue, emptyInputValue]);

  /**
   * Ensure that the select menu is positioned correctly **even** if it's anchor
   * (the `TextField`) changes shape.
   * @see {@link https://github.com/jamesmfriedman/rmwc/issues/611}
   */
  useEffect(() => {
    (foundationRef.current as any)?.autoPosition_();
  });

  useEffect(() => {
    if (focused && inputRef.current) inputRef.current.focus();
  }, [focused]);

  const prevForceUpdateSuggestions = usePrevious(forceUpdateSuggestions);
  useEffect(() => {
    if (!forceUpdateSuggestions || prevForceUpdateSuggestions) return;
    void updateSuggestions();
  }, [updateSuggestions, forceUpdateSuggestions, prevForceUpdateSuggestions]);

  /**
   * We clear the timeout set by `this.closeSuggestions` to ensure that the
   * user doesn't get a blip where the suggestion select menu disappears and
   * reappears abruptly.
   * @see {@link https://bit.ly/2x9eM27}
   */
  const openSuggestions = useCallback(() => {
    if (suggestionsTimeoutId.current) {
      clearTimeout(suggestionsTimeoutId.current);
      suggestionsTimeoutId.current = undefined;
    }
    hasOpenedSuggestions.current = true;
    setSuggestionsOpen(true);
  }, []);
  const closeSuggestions = useCallback(() => {
    suggestionsTimeoutId.current = setTimeout(() => {
      setSuggestionsOpen(false);
      lastSelectedRef.current = undefined;
    }, 0);
  }, []);

  /**
   * We don't show the suggestion menu until after the user has started typing.
   * That way, the user learns that they can type to filter/search the options.
   * After they learn that (i.e. after the menu has been opened at least once),
   * we revert back to the original behavior (i.e. opening the menu whenever the
   * `TextField` input is focused).
   */
  const maybeOpenSuggestions = useCallback(() => {
    if (autoOpenMenu || hasOpenedSuggestions.current) openSuggestions();
  }, [autoOpenMenu, openSuggestions]);

  /**
   * This function pushes `<textarea>` to the next line when it's width is less
   * than the width of its text content.
   *
   * To measure the width of the content, the width of the invisible `<span>` is
   * used (to which the value of `<textarea>` is then assigned).
   */
  const updateInputLine = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      if (singleLine && ghostElementRef.current && inputRef.current) {
        ghostElementRef.current.innerText = event.currentTarget.value;
        inputRef.current.style.width = `${Math.ceil(
          ghostElementRef.current.clientWidth + 0.5
        )}px`;
      } else if (!singleLine && ghostElementRef.current) {
        ghostElementRef.current.innerText = event.currentTarget.value;

        if (
          ghostElementRef.current.clientWidth > event.currentTarget.clientWidth
        ) {
          textareaBreakWidth.current = event.currentTarget.clientWidth;
          setLineBreak(true);
        } else if (
          textareaBreakWidth.current &&
          ghostElementRef.current.clientWidth <= textareaBreakWidth.current
        ) {
          textareaBreakWidth.current = undefined;
          setLineBreak(false);
        }
      }
    },
    [singleLine]
  );

  /**
   * Workaround for styling the input as if it has content. If there are
   * options selected (in the given `options` object) and the `TextField`
   * would otherwise be empty, this will update the current input's value to a
   * string containing a space (`' '`) so that the `TextField` styles itself as
   * if it were filled. Otherwise, this acts as it normally would by updating
   * the `TextField`'s value using `setState`.
   * @see {@link https://github.com/jamesmfriedman/rmwc/issues/601}
   */
  const updateInputValue = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      updateInputLine(event);
      setInputValue(event.currentTarget.value);
      void updateSuggestions(event.currentTarget.value);
      openSuggestions();
    },
    [updateInputLine, updateSuggestions, openSuggestions]
  );

  /**
   * Selects or un-selects the given option string by setting it's value in
   * `this.state.selected` to `true` which:
   * 1. Checks it's corresponding `mdc-checkbox` within our drop-down menu.
   * 2. Adding it as a chip to the `mdc-text-field` content.
   */
  const updateSelected = useCallback(
    (option: O, event?: MouseEvent) => {
      const selected = Array.from(value);
      const selectedIndex = selected.findIndex((s) => s.value === option.value);
      if (selectedIndex < 0) {
        selected.push(option);
      } else {
        selected.splice(selectedIndex, 1);
      }

      if (suggestions.length && lastSelectedRef.current && event?.shiftKey) {
        // Select/unselect multiple options with 'SHIFT + click'
        const idx = suggestions.indexOf(option);
        const idxOfLast = suggestions.findIndex(
          (s) => s.value === (lastSelectedRef.current || {}).value
        );
        suggestions
          .slice(Math.min(idx, idxOfLast), Math.max(idx, idxOfLast) + 1)
          .forEach((suggestion) => {
            const index = selected.findIndex(
              (s) => s.value === suggestion.value
            );
            if (selectedIndex < 0 && index < 0) {
              selected.push(suggestion);
            } else if (selectedIndex >= 0 && index >= 0) {
              selected.splice(index, 1);
            }
          });
      }

      lastSelectedRef.current = option;

      onChange(selected);
      setInputValue((prev) => (selectedIndex < 0 ? '' : prev));
      setLineBreak(false);
    },
    [value, onChange, suggestions]
  );

  const { updateEl, removeEl } = useClickContext();
  const elementId = useRef<string>(`select-${nanoid()}`);
  const menuSurfaceRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return removeEl(elementId.current);
      return updateEl(elementId.current, node);
    },
    [updateEl, removeEl]
  );

  return (
    <MenuSurfaceAnchor className={className}>
      <MenuSurface
        ref={menuSurfaceRef}
        foundationRef={foundationRef}
        open={suggestionsOpen}
        onFocus={(event: SyntheticEvent<HTMLDivElement>) => {
          event.preventDefault();
          event.stopPropagation();
          if (inputRef.current) inputRef.current.focus();
        }}
        anchorCorner='bottomStart'
        renderToPortal={renderToPortal ? '#portal' : false}
        className={!suggestions.length ? styles.errMenu : ''}
      >
        <SelectSurface
          suggestions={suggestions}
          noResultsMessage={noResultsMessage}
          updateSelected={updateSelected}
          errored={errored}
          value={value}
        />
      </MenuSurface>
      <SelectHint open={suggestionsOpen}>
        <TextField
          {...textFieldProps}
          textarea
          inputRef={inputRef}
          value={inputValue}
          onFocus={() => {
            if (onFocused) onFocused();
            maybeOpenSuggestions();
          }}
          onBlur={() => {
            if (onBlurred) onBlurred();
            closeSuggestions();
          }}
          onChange={updateInputValue}
          className={styles.textField}
        >
          {value.map((opt) => (
            <Chip
              key={
                typeof opt.value === 'string' || typeof opt.value === 'number'
                  ? opt.value
                  : opt.label
              }
              label={opt.label}
              trailingIcon={<CloseIcon />}
              onTrailingIconInteraction={() => updateSelected(opt)}
              className={styles.chip}
            />
          ))}
          {lineBreak && <div className={styles.lineBreak} />}
          <span ref={ghostElementRef} className={styles.ghost} />
        </TextField>
      </SelectHint>
    </MenuSurfaceAnchor>
  );
}
