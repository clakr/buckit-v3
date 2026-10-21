import { createSerializationAdapter, notFound } from "@tanstack/react-router";

export class AppError extends Error {
  override name = "AppError";
}

export class SessionExpiredError extends AppError {
  override name = "SessionExpiredError";
}

export class NotFoundError extends AppError {
  override name = "NotFoundError";
}

export class ConflictError extends AppError {
  override name = "ConflictError";
}

export class InsufficientFundsError extends AppError {
  override name = "InsufficientFundsError";
}

export class RateLimitedError extends AppError {
  override name = "RateLimitedError";
}

export function describeErrorForUser(error: unknown, fallback: string) {
  return error instanceof AppError ? error.message : fallback;
}

export async function loadOrThrowRouteNotFound<T>(load: Promise<T>) {
  try {
    return await load;
  } catch (error) {
    if (error instanceof NotFoundError) throw notFound();
    throw error;
  }
}

// Keyed by a literal `name` rather than `constructor.name`, which minification mangles.
const APP_ERRORS = {
  AppError,
  SessionExpiredError,
  NotFoundError,
  ConflictError,
  InsufficientFundsError,
  RateLimitedError,
};

function isAppErrorName(name: string): name is keyof typeof APP_ERRORS {
  return Object.hasOwn(APP_ERRORS, name);
}

export const appErrorSerializationAdapter = createSerializationAdapter({
  key: "app-error",
  test: (value): value is AppError => value instanceof AppError,
  toSerializable: (error) => ({ name: error.name, message: error.message }),
  fromSerializable: ({ name, message }) =>
    new (isAppErrorName(name) ? APP_ERRORS[name] : AppError)(message),
});
