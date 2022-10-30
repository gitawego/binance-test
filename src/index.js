
import { config } from './config.js';
import { BianceClient } from './BinanceClient.js';

const binanceClient = new BianceClient(config);
binanceClient.start();
