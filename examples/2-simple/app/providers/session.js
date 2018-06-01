class Session {
  constructor(storage) {
    this.storage = storage;
    // TODO Maybe interface checking here (e.g. the `storage` has `incr` and `get` methods)
  }

  incrTimesRan() {
    this.storage.incr('app:times_ran');
  }

  get getTimesRan() {
    return this.storage.get('app:times_ran');
  }
}

module.exports = {
  boot({ redisClient }, { singleton }) {
    singleton('session', () => new Session(redisClient));
    // TODO Can we make it this way rather than the above
    // singleton('session', Session, redisClient);
  },
};
