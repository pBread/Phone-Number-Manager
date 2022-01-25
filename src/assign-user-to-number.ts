import type { ServerlessFunctionSignature } from "@twilio-labs/serverless-runtime-types/types";
import { Twilio } from "twilio";

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = new Twilio(ACCOUNT_SID, AUTH_TOKEN);

interface Event {
  employeeId: string;
  phoneNumber: string; // IMPORTANT: must be in 10DLC format: +18185558888
}

/**
 * This assigns an existing phone number to a user.
 */

export const handler: ServerlessFunctionSignature = async (
  ctx,
  { employeeId, phoneNumber }: Event,
  callback
) => {
  try {
    const [msgSvcSid, phoneNumberSid] = await Promise.all([
      getMsgSvcSid(),
      assignPhoneNumberToEmployee(employeeId, phoneNumber),
    ]);

    const msgSvcPhoneNumberSid = await assignPhoneNumberToMsgSvc(
      msgSvcSid,
      phoneNumberSid
    );

    return callback(null, { msgSvcPhoneNumberSid, msgSvcSid, phoneNumberSid });
  } catch (error) {
    return callback(error);
  }
};

/**
 * Query all Messaging Services
 * Sort by created date (or any unchanging property) so users are accumulated in the oldest Messaging Services
 * Loop through each Messaging Service & return the first Messaging Service with capacity
 */

async function getMsgSvcSid() {
  const msgSvcSids = await client.messaging.services
    .list()
    .then((svcs) =>
      svcs
        .sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime())
        .map((svc) => svc.sid)
    );

  let msgSvc: string;
  for (const msgSvcSid of msgSvcSids) {
    const phoneNumberCount = await client.messaging
      .services(msgSvcSid)
      .phoneNumbers.list()
      .then((phoneNumbers) => phoneNumbers.length);

    if (phoneNumberCount >= 10000) continue;

    msgSvc = msgSvcSid;
    break;
  }

  if (!msgSvc) throw Error("No Messaging Services have capacity");

  return msgSvc;
}

/**
 * Finds the incomingPhoneNumber record
 * Updates the incomingPhoneNumber friendly name to be the employeeId. This is will make it easier to deprovision that user.
 */

async function assignPhoneNumberToEmployee(
  employeeId: string,
  phoneNumber: string
) {
  const phoneNumberRecord = await client.incomingPhoneNumbers
    .list({ phoneNumber })
    .then((data) => data[0]);

  if (!phoneNumberRecord) throw Error("Unable to find incoming phone number");

  await client
    .incomingPhoneNumbers(phoneNumberRecord.sid)
    .update({ friendlyName: employeeId });

  return phoneNumberRecord.sid;
}

async function assignPhoneNumberToMsgSvc(
  msgSvcSid: string,
  phoneNumberSid: string
) {
  const msgSvcPhoneNumber = await client.messaging
    .services(msgSvcSid)
    .phoneNumbers.create({ phoneNumberSid });

  return msgSvcPhoneNumber.sid;
}
