'use strict';
// Tiny JSON-file store. One process, writes are debounced and atomic
// (write tmp file, then rename). Fine for a community-sized raffle tool;
// swap for SQLite/Postgres if you ever outgrow it.
const fs = require('node:fs');
const path = require('node:path');

const EMPTY = () => ({ version: 1, users: {}, xHandles: {}, raffles: {}, entries: {} });

class Store {
  constructor(file) {
    this.file = file;
    this.timer = null;
    this.data = EMPTY();
    if (file && fs.existsSync(file)) {
      this.data = Object.assign(EMPTY(), JSON.parse(fs.readFileSync(file, 'utf8')));
    }
  }
  save() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 150);
  }
  flush() {
    if (!this.file) return;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    fs.renameSync(tmp, this.file);
  }
  entriesFor(raffleId) {
    return (this.data.entries[raffleId] ||= {});
  }
}

module.exports = { Store };
