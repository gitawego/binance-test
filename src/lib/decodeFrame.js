import { FRAME_OPERATOR } from "./constant.js";

/**
 * @type {(Buffer | Uint8Array)[]}
 */
const chunks = [];
/**
 * @typedef{{
 *  '@operator': number | null;
 *  '@status': number | null;
 *  '@finished': boolean;
 *  '@type': string | null;
 * }} PacketHeaders
 *
 * @typedef {{
 *  headers: PacketHeaders;
 *  overflow: Buffer | null;
 *  payload: Buffer | Uint8Array | null
 * }} Packet
 *
 * @param {Buffer} buffer
 * @returns {Packet | null}
 */
export function decodeFrame(buffer) {
  if (!buffer || buffer.length < 2) {
    return null;
  }
  const fin = (buffer[0] & 128) === 128;
  const operator = (buffer[0] & 15);
  /**
   * @type {Packet}
   */
  const packet = {
    headers: {
      '@operator': operator,
      '@status': null,
      '@type': null,
      '@finished': fin
    },
    overflow: null,
    payload: null
  };
  let msgPayload = null;
  let msgOverflow = null;
  const mask = (buffer[1] & 128) === 128;
  let payloadLength = buffer[1] & 127;
  if (payloadLength <= 125) {

    if (mask === true && buffer.length >= payloadLength + 6) {

      const maskData = buffer.slice(2, 6);

      msgPayload = buffer.slice(6, 6 + payloadLength).map((value, index) => value ^ maskData[index % 4]);
      msgOverflow = buffer.slice(6 + payloadLength);

    } else if (buffer.length >= payloadLength + 2) {

      msgPayload = buffer.slice(2, 2 + payloadLength);
      msgOverflow = buffer.slice(2 + payloadLength);

    }

  } else if (payloadLength === 126) {

    payloadLength = (buffer[2] << 8) + buffer[3];

    if (mask === true && buffer.length >= payloadLength + 8) {

      const maskData = buffer.slice(4, 8);
      msgPayload = buffer.slice(8, 8 + payloadLength).map((value, index) => value ^ maskData[index % 4]);
      msgOverflow = buffer.slice(8 + payloadLength);
    } else if (buffer.length >= payloadLength + 4) {
      msgPayload = buffer.slice(4, 4 + payloadLength);
      msgOverflow = buffer.slice(4 + payloadLength);
    }
  } else if (payloadLength === 127) {
    const hi = (buffer[2] * 0x1000000) + ((buffer[3] << 16) | (buffer[4] << 8) | buffer[5]);
    const lo = (buffer[6] * 0x1000000) + ((buffer[7] << 16) | (buffer[8] << 8) | buffer[9]);

    payloadLength = (hi * 4294967296) + lo;

    if (mask === true && buffer.length >= payloadLength + 14) {

      const maskData = buffer.slice(10, 14);

      msgPayload = buffer.slice(14, 14 + payloadLength).map((value, index) => value ^ maskData[index % 4]);
      msgOverflow = buffer.slice(14 + payloadLength);

    } else if (buffer.length >= payloadLength + 10) {

      msgPayload = buffer.slice(10, 10 + payloadLength);
      msgOverflow = buffer.slice(10 + payloadLength);

    }
  }
  if (msgOverflow !== null && msgOverflow.length > 0) {
    packet.overflow = msgOverflow;
  }
  if (msgPayload === null) {
    return null;
  }
  switch (operator) {
    case FRAME_OPERATOR.CONTINUATION:
      packet.headers['@type'] = mask === true ? 'request' : 'response';
      // packet.payload = msgPayload;
      if (fin === true) {
        // Reader: Concat previously cached fragmented frames
        chunks.push(msgPayload);
        packet.payload = Buffer.concat(chunks);
        chunks.length = 0;
      } else {
        chunks.push(msgPayload);
      }
      break;
    case FRAME_OPERATOR.TEXT:
    case FRAME_OPERATOR.BINARY:
      // 0x01: Text Frame (possibly fragmented)
      // 0x02: Binary Frame (possibly fragmented)
      packet.headers['@type'] = mask === true ? 'request' : 'response';
      // packet.payload = msgPayload;
      if (fin === true) {
        chunks.push(msgPayload);
        packet.payload = Buffer.concat(chunks);
        chunks.length = 0;
      } else {
        // Reader: Cache fragmented frames
        chunks.push(msgPayload);
      }
      break;
    case FRAME_OPERATOR.CONNECTION_CLOSE:
      // 0x08: Connection Close Frame
      packet.headers['@status'] = (msgPayload[0] << 8) + (msgPayload[1]);
      packet.headers['@type'] = mask === true ? 'request' : 'response';
      packet.payload = null;
      break;
    case FRAME_OPERATOR.PING:
      // 0x09: Ping Frame
      packet.headers['@type'] = 'request';
      packet.payload = null;
      break;
    case FRAME_OPERATOR.PONG:
      // 0x0a: Pong Frame
      packet.headers['@type'] = 'response';
      packet.payload = null;
      break;
    default:
      packet.headers['@operator'] = FRAME_OPERATOR.CONNECTION_CLOSE;
      packet.headers['@status'] = 1002;
      packet.headers['@type'] = mask === true ? 'request' : 'response';
      packet.payload = msgPayload;
  }
  return packet;
};
