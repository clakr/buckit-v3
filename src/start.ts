import { createStart } from "@tanstack/react-start";

import { appErrorSerializationAdapter } from "#/lib/errors";

export const startInstance = createStart(() => ({
  serializationAdapters: [appErrorSerializationAdapter],
}));
