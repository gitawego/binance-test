export const config = {
  guid: '258EAFA5-E914-47DA-95CA-C5AB0DC85B11',
  coins: ["btcusdt", "ethusdt"],
  streams: ['trade', 'aggTrade', 'kline_1s'],
  autoReport: false,
  reportInterval: 30e3,
  server: {
    port: 443,
    host: 'stream.binance.com',
    path: '/stream',
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Version': 13,
    }
  }
}
