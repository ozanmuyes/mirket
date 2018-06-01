module.exports = {
  disable: false,
  boot({ config }, { singleton }) {
    const redis = require('redis-mock');
    const redisClient = redis.createClient(config.redis);

    singleton('redisClient', redisClient);

    // TODO Set `boot()`s `this` as kernel (proxy) but only allow `static` keyword.
    //      If omitted (e.g. `this.x`) take action as if it was called like
    //      `this.static.x`.
    //      See Session class in the 'app/providers/session' (especially
    //      'app:times_ran' literal in its methods)
    /* this.static.redis.appTimesRan = 'app:times_ran'; */

    if (redisClient.exists('app:times_ran') === 0) {
      redisClient.set('app:times_ran', 0);
    }
  },
};
