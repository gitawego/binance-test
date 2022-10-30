import { randomBytes } from 'node:crypto'
const TEXT = 0x1;
const BINARY = 0x2;

/**
 *
 * @param {Buffer} data
 * @param {Buffer} maskingKey
 * @returns
 */
function maskingData(data, maskingKey) {
  for (let i = 0; i < data.length; i++) {
    data[i] = data[i] ^ maskingKey[i & 3];
  }
  return data;
}
/**
 * @typedef {{
 *    fin?:number;
 *    masking?: boolean;
 * }} FrameOptions
 * @param {string | Buffer} data
 * @param {FrameOptions} options
 * @returns
 */
export function makeFrame(data, options = {}) {
  const isTextData = typeof (data) == 'string';
  const opcode = isTextData ? TEXT : BINARY;
  data = Buffer.from(data);
  const fin = options.fin == null ? true : options.fin;
  const frameBytes = [fin ? (0x80 | opcode) : opcode];

  const len = data != null ? data.length : 0;
  if (len <= 125) {
    frameBytes.push(options.masking ? (0x80 | len) : len);
  } else if (len <= 0xFFFF) {
    frameBytes.push(options.masking ? (0x80 | 126) : 126);
    frameBytes.push(len >>> 8);
    frameBytes.push(len & 0xFF);
  } else {
    frameBytes.push(options.masking ? (0x80 | 127) : 127);
    const lenBytes = Buffer.allocUnsafe(8);
    lenBytes.writeBigUInt64BE(BigInt(len));
    for (let i = 0; i < lenBytes.length; i++) {
      frameBytes.push(lenBytes[i]);
    }
  }
  let frame = Buffer.from(frameBytes);
  if (options.masking) {
    const maskingKey = randomBytes(4);
    data = maskingData(data, maskingKey);
    frame = Buffer.concat([frame, maskingKey, data]);
  } else {
    frame = Buffer.concat([frame, data]);
  }

  return frame;
}

/**
 *
 * @param {Buffer} buf
 * @returns
 */
export function arrayBufferToString(buf) {
  const enc = new TextDecoder("utf-8");
  return enc.decode(buf);
}

/**
 * @typedef{{
 *  '@operator': number | null;
 *  '@status': number | null;
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
  /**
   * @type {Packet}
   */
  const packet = {
    headers: {
      '@operator': null,
      '@status': null,
      '@type': null
    },
    overflow: null,
    payload: null
  };
  let msgPayload = null;
  let msgOverflow = null;
  // const fin = (buffer[0] & 128) === 128;
  const operator = (buffer[0] & 15);
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
  if (operator === 0x00) {
    // 0x00: Continuation Frame (fragmented)

    packet.headers['@operator'] = 0x00;
    packet.headers['@status'] = null;
    packet.headers['@type'] = mask === true ? 'request' : 'response';
    packet.payload = msgPayload;

  } else if (operator === 0x01 || operator === 0x02) {

    packet.headers['@operator'] = operator;
    packet.headers['@status'] = null;
    packet.headers['@type'] = mask === true ? 'request' : 'response';
    packet.payload = msgPayload;

  } else if (operator === 0x08) {

    // 0x08: Connection Close Frame

    packet.headers['@operator'] = 0x08;
    packet.headers['@status'] = (msgPayload[0] << 8) + (msgPayload[1]);
    packet.headers['@type'] = mask === true ? 'request' : 'response';
    packet.payload = null;

  } else if (operator === 0x09) {

    // 0x09: Ping Frame

    packet.headers['@operator'] = 0x09;
    packet.headers['@status'] = null;
    packet.headers['@type'] = 'request';
    packet.payload = null;

  } else if (operator === 0x0a) {

    // 0x0a: Pong Frame

    packet.headers['@operator'] = 0x0a;
    packet.headers['@status'] = null;
    packet.headers['@type'] = 'response';
    packet.payload = null;

  } else {

    // Connection Close Frame

    packet.headers['@operator'] = 0x08;
    packet.headers['@status'] = 1002;
    packet.headers['@type'] = mask === true ? 'request' : 'response';
    packet.payload = msgPayload;

  }
  return packet;
};
