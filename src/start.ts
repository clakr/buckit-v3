import { createStart } from "@tanstack/react-start";

import { appErrorSerializationAdapter } from "#/lib/errors";
import { sessionExpiryMiddleware } from "#/modules/authentication/session-expiry";

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorSerializationAdapter],
  functionMiddleware: [sessionExpiryMiddleware],
}));
