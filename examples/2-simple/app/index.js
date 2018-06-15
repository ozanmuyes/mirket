const debug = global.kernel.make('debug')('app');
const session = global.kernel.make('session');

debug('started');

session.incrTimesRan();
debug(`app was ran ${session.getTimesRan} times (incl. this).`);

debug('finished');
