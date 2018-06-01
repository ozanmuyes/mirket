module.exports = {
  register({ bind }) {
    const debug = require('debug');

    bind('debug', namespace => debug(namespace));
  },
  defer: true,
  boot() {
    const debug = make('debug', 'provider');

    debug('The boot phase is about to be finish');
  },
};
