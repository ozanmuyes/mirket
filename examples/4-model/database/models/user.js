'use strict';

/**
 * Define the model using `sequelize` and `DataTypes` and return the model definitaion.
 *
 * @param {import('sequelize').Sequelize} sequelize Sequelize instance
 * @param {import('sequelize').DataTypes} DataTypes Recognized data types by Sequelize
 */
module.exports = (sequelize, DataTypes) => {
  const user = sequelize.define('user', {
    // 'user' attributes
    //
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    //
  }, {
    // 'user' options
    //
    /* paranoid: true, */
  });

  user.associate = (/* { post } */) => {
    /* user.hasMany(post); */
  };

  return user;
};
