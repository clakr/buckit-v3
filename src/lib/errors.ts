import { createSerializationAdapter } from "@tanstack/react-router";

export class AppError extends Error {
  override name = "AppError";
}

export class UnauthorizedError extends AppError {
  override name = "UnauthorizedError";
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
