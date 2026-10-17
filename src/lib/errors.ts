import { createSerializationAdapter } from "@tanstack/react-router";

/**
 * An expected failure: one the user can act on, so its message is written for them and safe to
 * show as-is. Anything else thrown is a bug or an outage, whose message stays out of the UI.
 */
export class AppError extends Error {
  override name = "AppError";
}

export class UnauthorizedError extends AppError {
  override name = "UnauthorizedError";
}

/** Also thrown for a record the user doesn't own, so an ID can't be probed for existence. */
export class NotFoundError extends AppError {
  override name = "NotFoundError";
}

export class ConflictError extends AppError {
  override name = "ConflictError";
}

/** A write that would take a Bank Account's Unallocated below zero. */
export class InsufficientFundsError extends AppError {
  override name = "InsufficientFundsError";
}

/** What a failure toast or screen says: an `AppError`'s own message, otherwise `fallback`. */
export function describeErrorForUser(error: unknown, fallback: string) {
  return error instanceof AppError ? error.message : fallback;
}

// Keyed by a literal `name` rather than `constructor.name`, which minification mangles.
const APP_ERRORS = {
  AppError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
};

// Without this a thrown AppError reaches the client as a plain Error, so `instanceof` fails.
export const appErrorSerializationAdapter = createSerializationAdapter({
  key: "app-error",
  test: (value): value is AppError => value instanceof AppError,
  toSerializable: (error) => ({ name: error.name, message: error.message }),
  fromSerializable: ({ name, message }) =>
    new (APP_ERRORS[name as keyof typeof APP_ERRORS] ?? AppError)(message),
});
