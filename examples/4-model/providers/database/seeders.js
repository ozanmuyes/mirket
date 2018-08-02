'use strict';

module.exports = {
  boot({ Umzug, sequelize }, { paths, instance }) {
    const seeders = new Umzug({
      // See https://github.com/sequelize/umzug#configuration
      storage: 'none',
      migrations: {
        path: paths.seeders,
        params: [
          sequelize.getQueryInterface(),
          sequelize.constructor,
          function legacyDone() {
            throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.');
          },
        ],
      },
    });

    instance('database::seeders', seeders);
  },
};
