import type { ServerlessFunctionSignature } from "@twilio-labs/serverless-runtime-types/types";
import { Twilio } from "twilio";

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = new Twilio(ACCOUNT_SID, AUTH_TOKEN);

interface Event {
  employeeId: string;
}

export const handler: ServerlessFunctionSignature = async (
  ctx,
  { employeeId }: Event,
  callback
) => {
  try {
    const phoneNumbers = await client.incomingPhoneNumbers.list();
    const phoneNumber = phoneNumbers.find(
      (phoneNumber) => phoneNumber.friendlyName === employeeId
    );

    if (!phoneNumber) throw Error("No phone number found");

    await client.incomingPhoneNumbers(phoneNumber.sid).remove();

    return callback(null, { phoneNumber });
  } catch (error) {
    return callback(error);
  }
};
