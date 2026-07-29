export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

export type ID = string;
export type ISODateString = string;

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface ApiError {
  status?: number;
  message: string;
  details?: unknown;
}
