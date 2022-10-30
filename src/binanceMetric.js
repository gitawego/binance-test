import { decodeFrame } from './lib/decodeFrame.js';
import { NodeMetric } from './lib/NodeMetric.js';
import { config } from './config.js';
import { Metric } from './lib/metric.js';

/**
 * @type {Map<string, NodeMetric | Metric>}
 */
const metricMap = new Map();
const nodeMetricMap = new Map();

/**
 *
 * @param {string} streamName
 */
export function getMetric(streamName) {
  const metric = metricMap.get(streamName) || new Metric({
    id: streamName,
    autoReport: config.autoReport,
    interval: config.reportInterval
  });
  metricMap.set(streamName, metric);
  return metric;
}

/**
 *
 * @param {string} streamName
 */
export function getNodeMetric(streamName) {
  const metric = nodeMetricMap.get(streamName) || new NodeMetric({
    id: streamName,
    autoReport: config.autoReport,
    interval: config.reportInterval
  });
  nodeMetricMap.set(streamName, metric);
  return metric;
}

/**
 *
 * @param {ReturnType<decodeFrame>} decodedFrame
 */
export function getMetricFromData(decodedFrame) {
  const payloadString = decodedFrame?.payload?.toString();
  return getMetricFromPayload(payloadString);
}

/**
 *
 * @param {string} [payload]
 */
export function getMetricFromPayload(payload) {
  try {
    const res = payload ? JSON.parse(payload) : null;
    return {
      metric: res?.stream ? getMetric(res.stream) : null,
      nodeMetric: res?.stream ? getNodeMetric(res.stream) : null,
      record: res
    };
  } catch (error) {
    return {
      error,
      rawRecord: payload
    }
  }
}
