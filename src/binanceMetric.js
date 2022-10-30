import { decodeFrame } from './frames.js';
// import { Metric } from './lib/metric.js';
import { NodeMetric } from './lib/NodeMetric.js';
import { config } from './config.js';

/**
 * @type {Map<string, NodeMetric>}
 */
const map = new Map();

/**
 *
 * @param {string} streamName
 */
export function getMetric(streamName) {
  const metric = map.get(streamName) || new NodeMetric({
    id: streamName,
    autoReport: config.autoReport,
    interval: config.reportInterval
  });
  map.set(streamName, metric);
  return metric;
}

/**
 *
 * @param {Buffer} data
 */
export function getMetricFromData(data) {
  const payloadString = decodeFrame(data)?.payload?.toString();
  try {
    const res = payloadString ? JSON.parse(payloadString) : null;
    // console.log('payloadString', res);
    return {
      metric: res?.stream ? getMetric(res.stream) : null,
      record: res
    };
  } catch (error) {
    return {
      error,
      rawRecord: payloadString
    }
  }

}
