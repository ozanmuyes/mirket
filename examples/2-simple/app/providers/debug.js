module.exports = {
  register({ bind }) {
    const debug = require('debug');

    /* bind('debug', namespace => debug(namespace)); */
    bind('debug', () => debug); // the 'debug' might as well 'createDebug'
  },
  defer: true,
  boot({ debug: createDebug }) {
    const debug = createDebug('debug provider');

    debug('The boot phase is about to be finished');
  },
};
