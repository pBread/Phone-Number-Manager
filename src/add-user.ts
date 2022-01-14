import type { ServerlessFunctionSignature } from "@twilio-labs/serverless-runtime-types/types";
import { Twilio } from "twilio";

const { ACCOUNT_SID, AUTH_TOKEN } = process.env;
const client = new Twilio(ACCOUNT_SID, AUTH_TOKEN);

interface Event {
  areaCode: number;
  employeeId: string;
}

export const handler: ServerlessFunctionSignature = async (
  ctx,
  { areaCode = 206, employeeId }: Event,
  callback
) => {
  try {
    const [msgSvcSid, phoneNumberSid] = await Promise.all([
      getMsgSvcSid(),
      buyPhoneNumber(employeeId, areaCode),
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

async function buyPhoneNumber(employeeId: string, areaCode: number) {
  const availablePhoneNumber = await client
    .availablePhoneNumbers("US")
    .local.list({ areaCode, limit: 1 })
    .then((list) => list[0]?.phoneNumber);

  if (!availablePhoneNumber)
    throw Error("Unable to find available phone number");

  const incomingPhoneNumber = await client.incomingPhoneNumbers.create({
    friendlyName: employeeId,
    phoneNumber: availablePhoneNumber,
  });

  return incomingPhoneNumber.sid;
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
