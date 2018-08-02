'use strict';

module.exports = {
  /** @param {import('sequelize').QueryInterface} queryInterface */
  up: (queryInterface) => {
    const now = new Date();

    return queryInterface.bulkInsert('users', [
      {
        firstName: 'John',
        lastName: 'Doe',
        createdAt: now,
        updatedAt: now,
      },
      //
    ]);
  },
};
