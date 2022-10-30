# binance-test

## Prerequisites

- It must run on node.js (latest LTS version)
- No binance/crypto related libraries allowed
- A maximum of 2 external libraries are allowed (the less the better) (Sub-dependencies do not count here)
- Execute below tasks on main-net (api.binance.com & wss://stream.binance.com)
- Unit tests/any form of testing for the below tasks is completely optional
- SPOT documentation available at https://binance-docs.github.io/apidocs/spot/en/#change-log

## Tasks

- Open 1 "empty" websocket and then LIVE SUB-scribe to 2 trade streams, 2 aggTrade streams and 2 kline streams
  - at first, I implemented websocket frame management to send and receive websocket data, but I encountered issue for parsing multiple data in one message. So I have to use the lib [ws](https://github.com/websockets/ws) to avoid re-implement all the frame decode mechanic.
  - to test with custom implementation, set `useWS` to `false` in the `config.js`
- Measure websocket event time => client receive time latency for each specific stream and print min/avg/max (optimize for high throughput) to console every 1 min
  - I implemented two classes:
    - Metric: a simple way to mesure the avg/min/max metrics by recording data of a given interval (1 minute), and calculate the values
    - NodeMetric: I use [histogram](https://nodejs.org/api/perf_hooks.html#perf_hookscreatehistogramoptions) of nodejs
  - Result: thoses two metrics have quite similar results.

## Run the program

- recommanded nodejs version: >= 18
- lib used for program:
  - ws
- libs for linter and typings:
  - @typescript-eslint
  - eslint
  - typescript
- once checked out the project, do `npm i` at the project root
- to start the server: `npm start`
- logs are found in the console.
