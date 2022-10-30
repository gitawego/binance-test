export class Metric {
  /**
   * @typedef{{
   *   id?: string;
   *   autoReport?: boolean;
   *   interval?: number;
   * }} MetricOptions
   * @param {MetricOptions} [opt]
   */
  constructor(opt) {
    this.lastRecordTime = Date.now();
    /**
     * @typedef {{
     *   timestamp: number;
     *   duration: number;
     * }} Record
     */
    /**
     * @type {Record[]}
     */
    this.records = [];
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
        console.log(`==== Metrics Report for ${this.id} ===`);
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
    this.records.push({
      timestamp: now,
      duration: currentDuration
    });
    this.lastRecordTime = now;
  }
  getRecordsInPeriode() {
    const now = Date.now();
    const lastOne = now - this.interval;
    return this.records.filter(record => record.timestamp >= lastOne);
  }
  avg(records = this.records) {
    return +(records.reduce((avg, r) => avg + r.duration, 0) / records.length).toFixed(2);
  }
  min(records = this.records) {
    return records.reduce((avg, r) => {
      if (avg <= 0) {
        return r.duration;
      }
      return Math.min(avg, r.duration)
    }, 0)
  }
  max(records = this.records) {
    return records.reduce((avg, r) => Math.max(avg, r.duration), 0)
  }
  showMetric() {
    this.records = this.getRecordsInPeriode();
    return {
      id: this.id,
      avg: this.avg(),
      min: this.min(),
      max: this.max(),
      totalRecordsInThePeriod: this.records.length,
      interval: this.interval
    }
  }
}
