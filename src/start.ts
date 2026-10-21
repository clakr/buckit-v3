import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

import { appErrorSerializationAdapter } from "#/lib/errors";
import { sessionExpiryMiddleware } from "#/modules/authentication/session-expiry";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorSerializationAdapter],
  requestMiddleware: [csrfMiddleware],
  functionMiddleware: [sessionExpiryMiddleware],
}));
