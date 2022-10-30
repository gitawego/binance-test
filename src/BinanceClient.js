import { randomBytes, createHash } from 'node:crypto';
import { request } from 'node:https';
import { getMetricFromData } from './binanceMetric.js';
import { makeFrame, pongFrame } from './lib/frames.js';
import { decodeFrame } from './lib/decodeFrame.js';
import { FRAME_OPERATOR } from './lib/constant.js';

export class BianceClient {
  /**
   * @param {import("./typing").BinanceClientOptions} opt
   */
  constructor(opt) {
    this.opt = opt;
    this.key = randomBytes(16).toString('base64');
    this.digest = createHash('sha1')
      .update(this.key + this.opt.guid)
      .digest('base64');
  }
  generateTopics() {
    return this.opt.coins.reduce((arr, coin) => {
      const streams = this.opt.streams.map(stream => `${coin}@${stream}`);
      arr.push(...streams);
      return arr;
    }, []);
  }
  start() {
    const req = request({
      ...this.opt.server,
      headers: {
        ...this.opt.server.headers,
        'Sec-WebSocket-Key': this.key
      }
    });
    req.end();
    req.on('upgrade', (res, socket, upgradeHead) => {
      if (res.headers['sec-websocket-accept'] !== this.digest) {
        console.error('Invalid Sec-WebSocket-Accept header');
        return;
      }
      console.log('got upgraded!', res.headers);
      const data = JSON.stringify({
        "method": "SUBSCRIBE",
        "params": this.generateTopics(),
        "id": 1
      });
      socket.write(makeFrame(data));
      socket.on('data', data => {
        const deframed = this.deframeData(data);
        if (deframed?.headers?.['@operator'] === FRAME_OPERATOR.PING) {
          socket.write(pongFrame());
          return;
        }
        const metric = getMetricFromData(deframed);
        metric.metric?.addRecord();
      });
      socket.on('end', () => {
        console.log('end');
      });
      socket.on('close', (err) => {
        console.log('closed', err);
        process.exit(0);
      })
    });
  }
  /**
   *
   * @param {Buffer} data
   * @returns
   */
  deframeData(data) {
    return decodeFrame(data);
  }
}
