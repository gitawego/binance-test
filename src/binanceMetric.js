import { decodeFrame } from './lib/decodeFrame.js';
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
 * @param {ReturnType<decodeFrame>} decodedFrame
 */
export function getMetricFromData(decodedFrame) {
  const payloadString = decodedFrame?.payload?.toString();
  console.log('payloadString', payloadString);
  try {
    const res = payloadString ? JSON.parse(payloadString) : null;
    return {
      metric: res?.stream ? getMetric(res.stream) : null,
      record: res
    };
  } catch (error) {
    console.log(decodedFrame, payloadString);
    return {
      error,
      rawRecord: payloadString
    }
  }

}
