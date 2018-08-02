'use strict';

module.exports = {
  register({ instance }) {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Umzug = require('umzug');

    instance('Umzug', Umzug);
  },
};
