'use strict';

module.exports = {
  /** @param {import('sequelize').QueryInterface} queryInterface */
  up: (queryInterface) => {
    const model = make('database::models::user');

    return queryInterface.createTable(model.tableName, model.attributes);
  },
  /** @param {import('sequelize').QueryInterface} queryInterface */
  down: (queryInterface) => {
    const model = make('database::models::user');

    return queryInterface.dropTable(model.tableName);
  },
};
