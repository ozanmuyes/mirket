const mirket = require('../../forExample')({
  rootPath: __dirname,
  providersPath: 'app/providers',
});

mirket.bootSync();

require('./app');
