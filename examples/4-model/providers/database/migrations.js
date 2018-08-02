'use strict';

module.exports = {
  boot({ Umzug, sequelize }, { paths, instance }) {
    const migrations = new Umzug({
      // See https://github.com/sequelize/umzug#configuration
      storage: 'sequelize',
      storageOptions: { sequelize },
      migrations: {
        path: paths.migrations,
        params: [
          sequelize.getQueryInterface(),
          sequelize.constructor,
          function legacyDone() {
            throw new Error('Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.');
          },
        ],
      },
    });

    instance('database::migrations', migrations);
  },
};
