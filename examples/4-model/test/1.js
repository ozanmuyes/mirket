'use strict';

const assert = require('assert');

describe('Models', function() {
  before(function(done) {
    // Migrate and seed
    //
    const migrations = kernel.make('database::migrations');
    const seeders = kernel.make('database::seeders');

    migrations.up()
      .then(() => {
        seeders.up()
          .then(() => done())
          .catch((err) => {
            done(err);
          });
      })
      .catch((err) => {
        done(err);
      });
  });

  after(async function() {
    // Rollback
    //
    const migrations = kernel.make('/* test:: */database::migrations');

    return migrations.down();
  });

  it('should return a user', async function() {
    /** @type {import('sequelize').Model} */
    const model = kernel.make('/* test:: */database::models::user');

    const records = await model.findAll({}, {
      limit: 10,
    });

    assert(records.length > 0 && records.length <= 10);
    //

    return Promise.resolve();
  });

  //
});
