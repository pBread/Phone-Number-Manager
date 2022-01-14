import type { ServerlessFunctionSignature } from "@twilio-labs/serverless-runtime-types/types";

export const handler: ServerlessFunctionSignature = async (
  ctx,
  event,
  callback
) => {
  console.log("event", event);

  return callback(null, { yoko: "ono" });
};
