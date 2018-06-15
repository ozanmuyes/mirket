/* eslint-disable no-underscore-dangle */

const fs = require('fs');

const defaultConfig = {
  filePath: `${__dirname}/redis-mock.db`,
  host: '127.0.0.1',
  port: 6379,
  path: null,
  url: null,
};

class RedisMock {
  constructor(config) {
    this.config = Object.assign({}, defaultConfig, config);
    this.keys = new Map();
    //

    this._load();
  }

  _load() {
    if (fs.existsSync(this.config.filePath)) {
      const db = JSON.parse(fs.readFileSync(this.config.filePath)); // eslint-disable-line

      Object.keys(db).forEach((key) => {
        this.keys.set(key, db[key]);
      });
    }
  }

  _save() {
    if (this.keys.size === 0) {
      fs.unlinkSync(this.config.filePath);
      return;
    }

    const obj = {};

    this.keys.forEach((value, key) => {
      obj[key] = value;
    });

    fs.writeFileSync(this.config.filePath, JSON.stringify(obj));
  }

  exists(key) {
    return (this.keys.has(key))
      ? 1
      : 0;
  }

  set(key, value) {
    this.keys.set(key, value);
    this._save();

    return 1;
  }

  incr(key, by = 1) {
    const value = this.keys.get(key);

    if (value !== null) {
      this.keys.set(key, Number.parseInt(value, 10) + by);
      this._save();
    }
  }

  get(key) {
    return this.keys.get(key);
  }

  delete(key) {
    this.keys.delete(key);
    this._save();
  }
}

module.exports = {
  createClient(config = {}) {
    return new RedisMock(config);
  },
};
