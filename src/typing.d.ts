export interface BinanceClientOptions {
  guid:           string;
  coins:          string[];
  streams:        string[];
  autoReport:     boolean;
  reportInterval: number;
  server:         Server;
  useWS?:          boolean;
}

export interface Server {
  port:    number;
  host:    string;
  path:    string;
  headers: BaseHeaders | Record<string, string>;
}

export interface BaseHeaders {
  Connection:              string;
  Upgrade:                 string;
  'Sec-WebSocket-Version': number;
}
