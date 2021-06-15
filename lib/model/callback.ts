export type CallbackParam<T> = T | ((prev: T) => T);
export type TCallback<T> = (param: T) => void;
export type FCallback<T> = (param: (prev: T) => T) => void;
export type Callback<T> = (param: CallbackParam<T>) => void;
