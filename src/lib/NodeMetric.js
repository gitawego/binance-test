import { createHistogram } from 'node:perf_hooks';

export class NodeMetric {
  /**
   * @typedef{{
   *   id?: string;
   *   autoReport?: boolean;
   *   interval?: number;
   * }} MetricOptions
   * @param {MetricOptions} [opt]
   */
  constructor(opt) {
    this.histogram = createHistogram();
    this.lastRecordTime = Date.now();
    if (opt) {
      /**
       * @type {MetricOptions}
       */
      this.opt = opt;
    }
    this.interval = this.opt?.interval ?? 60e3;
    this.id = this.opt?.id ?? 'metrics';
    this.init();
  }
  init() {
    if (this.opt?.autoReport) {
      this.intervalHandler = setInterval(() => {
        console.log(`==== Node Metrics Report for ${this.id} ===`);
        console.log(this.showMetric());
        console.log('===================================')
      }, this.interval);
    }
  }
  stopAutoReport() {
    clearInterval(this.intervalHandler);
  }
  addRecord() {
    const now = Date.now();
    const currentDuration = now - this.lastRecordTime;
    if (currentDuration > 0) {
      this.histogram.record(currentDuration);
    }
    this.lastRecordTime = now;
  }
  showMetric() {
    return {
      id: this.id,
      avg: this.histogram.mean,
      min: this.histogram.min,
      max: this.histogram.max,
      p10: this.histogram.percentile(10),
      p50: this.histogram.percentile(50),
      p75: this.histogram.percentile(75),
      p99: this.histogram.percentile(99),
      interval: this.interval
    }
  }
}
