import type { ServerlessFunctionSignature } from "@twilio-labs/serverless-runtime-types/types";
import { Twilio } from "twilio";

const { AUTH_TOKEN, ACCOUNT_SID } = process.env;

export const handler: ServerlessFunctionSignature = async (
  ctx,
  event,
  callback
) => {
  return callback(null, { yoko: "ono" });
};

async function getMessagingService() {}
