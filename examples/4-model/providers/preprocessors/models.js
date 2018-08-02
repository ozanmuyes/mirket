'use strict';

const fs = require('fs');

module.exports = {
  boot({ sequelize }, { paths, instance }) {
    const modelsPath = paths.models;

    if (!fs.existsSync(modelsPath)) {
      return;
    }

    fs.readdirSync(modelsPath)
      .filter(key => (key[0] !== '_'))
      .forEach((modelPath) => {
        const model = sequelize.import(`${modelsPath}/${modelPath}`);

        instance(`database::models::${model.name}`, model);
      });

    Object.keys(sequelize.models).forEach((modelName) => {
      if (typeof sequelize.models[modelName].associate === 'function') {
        sequelize.models[modelName].associate(sequelize.models);
      }
    });
  },
};
