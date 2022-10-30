
import { randomBytes, createHash } from 'node:crypto';
import { request } from 'node:https';
import { getMetricFromData } from './binanceMetric.js';
import { makeFrame } from './frames.js';
import { config } from './config.js';

const key = randomBytes(16).toString('base64');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const digest = createHash('sha1')
  .update(key + GUID)
  .digest('base64');

const options = {
  ...config.server,
  headers: {
    ...config.server.headers,
    'Sec-WebSocket-Key': key
  }
};

function generateTopics() {
  return config.coins.reduce((arr, coin) => {
    const streams = config.streams.map(stream => `${coin}@${stream}`);
    arr.push(...streams);
    return arr;
  }, []);
}

const req = request(options);
req.end();

req.on('upgrade', (res, socket, upgradeHead) => {
  if (res.headers['sec-websocket-accept'] !== digest) {
    console.error('Invalid Sec-WebSocket-Accept header');
    return;
  }
  console.log('got upgraded!', res.headers);
  const data = JSON.stringify({
    "method": "SUBSCRIBE",
    "params": generateTopics(),
    "id": 1
  });
  socket.write(makeFrame(data));
  socket.on('data', data => {
    const metric = getMetricFromData(data);
    metric.metric?.addRecord();
  });
  socket.on('response', (data) => {
    console.log('ddd', data);
  });
  socket.on('end', () => {
    console.log('end');
  });
  socket.on('close', (err) => {
    console.log('closed', err);
    process.exit(0);
  })
});

