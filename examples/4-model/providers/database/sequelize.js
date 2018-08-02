'use strict';

module.exports = {
  register({ singleton }) {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Sequelize = require('sequelize');

    singleton('sequelize', () => {
      /** @type {import('sequelize').Options} */
      const dbConfig = {
        logging: false,
        operatorsAliases: Sequelize.Op, // NOTE See https://github.com/sequelize/sequelize/issues/8417#issuecomment-335124373
        dialect: 'sqlite',
        define: {
          // See http://docs.sequelizejs.com/manual/tutorial/models-definition.html#configuration
          timestamps: true, // add 'createdAt' and 'updatedAt' fields
          paranoid: true, // add 'deletedAt' and do not remove records, set 'deletedAt' instead
          // NOTE NO `underscored: true`
        },
        pool: {
          max: 1,
        },
        //
      };
      dbConfig.database = ':memory:';

      return new Sequelize(dbConfig);
    });
  },
};
