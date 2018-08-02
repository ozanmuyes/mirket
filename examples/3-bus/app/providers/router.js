'use strict';

module.exports = {
  register() {
    //
  },
  boot({ once, emit }) {
    //

    once('booted', () => {
      // Register routes here...
      const routesRegistered = [
        'Pages@index',
        'Pages@aboutUs',
        // ...
      ];

      emit('router::registered', routesRegistered);
    });
  },
};
