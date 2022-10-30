import { decodeFrame } from './frames.js';
import { Metric } from './lib/metric.js';

/**
 * @type {Map<string, Metric>}
 */
const map = new Map();

/**
 *
 * @param {string} streamName
 */
export function getMetric(streamName) {
  const metric = map.get(streamName) || new Metric({
    id: streamName,
    autoReport: true,
    interval: 30e3
  });
  map.set(streamName, metric);
  return metric;
}

/**
 *
 * @param {Buffer} data
 */
export function getMetricFromData(data) {
  try {
    const payloadString = decodeFrame(data)?.payload?.toString();
    const res = payloadString ? JSON.parse(payloadString) : null;
    return {
      metric: res?.stream ? getMetric(res.stream) : null,
      record: res
    };
  } catch (error) {
    return {
      error
    }
  }

}
