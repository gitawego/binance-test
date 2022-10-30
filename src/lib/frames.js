import { randomBytes } from 'node:crypto'
import { FRAME_OPERATOR } from './constant.js';

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
 *    opcode?: number;
 * }} FrameOptions
 * @param {string | Buffer} data
 * @param {FrameOptions} options
 * @returns
 */
export function makeFrame(data, options = {}) {
  const isTextData = typeof (data) == 'string';
  const opcode = options.opcode ?? (isTextData ? FRAME_OPERATOR.TEXT : FRAME_OPERATOR.BINARY);
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

export function pingFrame() {
  return makeFrame(Buffer.from('PING'), {
    opcode: FRAME_OPERATOR.PING
  });
}

export function pongFrame() {
  return makeFrame(Buffer.from('PONG'), {
    opcode: FRAME_OPERATOR.PONG
  });
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

