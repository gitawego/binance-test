
import { randomBytes, createHash } from 'node:crypto';
import { request } from 'node:https';
import { decodeFrame, makeFrame } from './frames.js';
const key = randomBytes(16).toString('base64');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const digest = createHash('sha1')
  .update(key + GUID)
  .digest('base64');
const subParams = {
  "method": "SUBSCRIBE",
  "params":
    [
      "btcusdt@trade",
      "ethusdt@trade",
      "btcusdt@aggTrade",
      "ethusdt@aggTrade",
      "btcusdt@kline_1s",
      "ethusdt@kline_1s",
    ],
  "id": 1
}
// make a request
const options = {
  port: 443,
  host: 'stream.binance.com',
  path: '/stream',
  headers: {
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    'Sec-WebSocket-Version': 13,
    'Sec-WebSocket-Key': key,
  }
};

const req = request(options);
req.end();

req.on('upgrade', (res, socket, upgradeHead) => {
  if (res.headers['sec-websocket-accept'] !== digest) {
    console.error('Invalid Sec-WebSocket-Accept header');
    return;
  }
  console.log('got upgraded!', res.headers);
  const data = JSON.stringify(subParams);
  socket.write(makeFrame(data));
  socket.on('data', data => {
    console.log('client received', data.length, decodeFrame(data)?.payload?.toString())
  });
});

