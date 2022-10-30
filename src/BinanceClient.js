import { randomBytes, createHash } from 'node:crypto';
import { request } from 'node:https';
import { getMetricFromData, getMetricFromPayload } from './binanceMetric.js';
import { makeFrame, pongFrame } from './lib/frames.js';
import { decodeFrame } from './lib/decodeFrame.js';
import { FRAME_OPERATOR } from './lib/constant.js';
import WebSocket from 'ws';


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
  wssUrl() {
    return `wss://${this.opt.server.host}${this.opt.server.path}`;
  }

  start() {
    if (this.opt.useWS) {
      this.startWC();
    } else {
      this.startNative()
    }
  }
  startWC() {
    const ws = new WebSocket(this.wssUrl());
    ws.on('open', () => {
      console.log('connection etablished, sub to topics');
      ws.send(this.subToCoinsMessage());
    });
    ws.on('message', (data) => {
      // console.log('received: %s', data);
      const metric = getMetricFromPayload(data.toString('utf-8'));
      metric.metric?.addRecord();
      metric.nodeMetric?.addRecord();
    });
  }
  /**
   * the custom native implementation has bug
   * when there are multiples data in one single message
   * to avoid implement all the frame decode mechanic, I used ws.
   *
   * @deprecated
   */
  startNative() {
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
      const data = this.subToCoinsMessage();
      socket.write(makeFrame(data));
      socket.on('data', data => {
        const deframed = this.deframeData(data);
        if (deframed?.headers?.['@operator'] === FRAME_OPERATOR.PING) {
          socket.write(pongFrame());
          return;
        }
        const metric = getMetricFromData(deframed);
        metric.metric?.addRecord();
        metric.nodeMetric?.addRecord();
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
  subToCoinsMessage() {
    return JSON.stringify({
      "method": "SUBSCRIBE",
      "params": this.generateTopics(),
      "id": 1
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
