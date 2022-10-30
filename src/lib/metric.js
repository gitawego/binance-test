class Metric {
  constructor() {
    /**
     * 1 minute
     */
    this.interval = 60e3;
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
    this.max = 0;
    this.min = 0;
  }
  addRecord() {
    const now = Date.now();
    const currentDuration = now - this.lastRecordTime;
    this.records.push({
      timestamp: now,
      duration: currentDuration
    });
    const firstRecord = this.records.length > 1;
    this.max = firstRecord ? Math.max(this.records[this.records.length - 2].duration, currentDuration) : currentDuration;
    this.min = firstRecord ? Math.min(this.records[this.records.length - 2].duration, currentDuration) : currentDuration;
    this.lastRecordTime = now;
  }
  getRecordsInPeriode() {
    const now = Date.now();
    const lastOne = now - this.interval;
    return this.records.filter(record => record.timestamp >= lastOne);
  }
  avg() {
    const records = this.records = this.getRecordsInPeriode();
    return +(records.reduce((avg, r) => avg + r.duration, 0) / records.length).toFixed(2);
  }
  showMetric() {
    return {
      avg: this.avg(),
      min: this.min,
      max: this.max
    }
  }
}
