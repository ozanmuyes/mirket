const debug = make('debug', 'app');
const session = make('session');

debug('started');

session.incrTimesRan();
debug(`app was ran ${session.getTimesRan} times (incl. this).`);

debug('finished');
