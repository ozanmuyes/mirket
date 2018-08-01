'use strict';

module.exports = {
  register({ instance }) {
    instance('config', {
      redis: {
        // See https://www.npmjs.com/package/redis#rediscreateclient
        host: '127.0.0.1',
        port: 6379,
        //
      },
      //
    });
  },
};
