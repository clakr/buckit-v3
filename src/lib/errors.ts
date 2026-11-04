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

const APP_ERRORS_BY_NAME = new Map<string, typeof AppError>(
  [
    AppError,
    SessionExpiredError,
    NotFoundError,
    ConflictError,
    InsufficientFundsError,
    RateLimitedError,
  ].map((errorClass) => [new errorClass().name, errorClass]),
);

export const appErrorSerializationAdapter = createSerializationAdapter({
  key: "app-error",
  test: (value): value is AppError => value instanceof AppError,
  toSerializable: (error) => ({ name: error.name, message: error.message }),
  fromSerializable: ({ name, message }) => new (APP_ERRORS_BY_NAME.get(name) ?? AppError)(message),
});
