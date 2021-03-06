'use strict';

const assert = require('assert');

const Mirket = require('../../'); // eslint-disable-line import/newline-after-import
const mirket = Mirket({
  rootPath: __dirname,
  providersPath: '',
});
/* const mirket = require('../../')({
  rootPath: __dirname,
  providersPath: '',
}); */

function getRandomInt(max = 1000) {
  return Math.floor(Math.random() * Math.floor(max));
}

// Foo
//
class Foo {
  constructor(message = null) {
    this.id = getRandomInt();
    this.type = 'Foo';
    this.message = (message || `${this.type}#${this.id}`);
  }
}

// FooCtr
//
function FooCtr(message = null) {
  this.id = getRandomInt();
  this.type = 'Bar';
  this.message = (message || `${this.type}#${this.id}`);
}

// bind
//
// mirket.bind('bindingFoo', message => new Foo(message));
mirket.bind('bindingFoo', Foo);

/** @type Foo */
const bfoo1 = mirket.make('bindingFoo');
/** @type Foo */
const bfoo2 = mirket.make('bindingFoo', 'Hello from bfoo2');

assert(bfoo1.id !== bfoo2.id);
assert(bfoo1.message === `${bfoo1.type}#${bfoo1.id}`);
assert(bfoo2.message === 'Hello from bfoo2');


// mirket.bind('bindingFooCtr', message => new FooCtr(message)); // This works
mirket.bind('bindingFooCtr', FooCtr, true); // NOTE Explicitly state that the function is a 'constructor' // this one uses positional args

/** @type FooCtr */
const bfooctr1 = mirket.make('bindingFooCtr');
/** @type FooCtr */
const bfooctr2 = mirket.make('bindingFooCtr', 'Hello from bfooctr2');

assert(bfooctr1 !== undefined);
assert(bfooctr2 !== undefined);
assert(bfooctr1.id !== bfooctr2.id);
assert(bfooctr1.message === `${bfooctr1.type}#${bfooctr1.id}`);
assert(bfooctr2.message === 'Hello from bfooctr2');


// singleton
//
mirket.singleton('singletonFoo', message => new Foo(message));

/** @type Foo */
const sfoo1 = mirket.make('singletonFoo', 'making for the first time');
/** @type Foo */
const sfoo2 = mirket.make('singletonFoo', 'making for the second time');

assert(sfoo1.id === sfoo2.id);
assert(sfoo1.message === 'making for the first time');
assert(sfoo2.message === 'making for the first time'); // NOT 'making for the second time'


// instance
//
const mfoo = new Foo('i\'m the only \'foo\' instance which created manually');

mirket.instance('foo', mfoo);

/** @type Foo */
const ref = mirket.make('foo');

assert(ref === mfoo);
assert(ref.message === 'i\'m the only \'foo\' instance which created manually');


// The below should error
//
let errord = false;
try {
  mirket.instance('fn', () => 42);
} catch (err) {
  // It's OK the above error'd
  errord = true;
}

if (errord === false) {
  throw new Error('instance method should error on functions except providers.');
}


// Bar
//
class Bar {
  constructor(/** @type Foo */ foo) {
    this.id = getRandomInt();
    this.type = 'Bar';
    this.message = foo.message;
    /** @type Foo */
    this.foo = foo;
  }
}

// bind
//
mirket.bind('bindingBar', ({ foo }) => new Bar(foo));

/** @type Bar */
const bbar1 = mirket.make('bindingBar');
/** @type Bar */
const bbar2 = mirket.make('bindingBar');

assert(bbar1.message === 'i\'m the only \'foo\' instance which created manually');
assert(bbar1.foo === bbar2.foo);


mirket.bind('bindingBarAlt', ({ bindingFoo: foo }) => new Bar(foo));

/** @type Bar */
const babar1 = mirket.make('bindingBarAlt');
/** @type Bar */
const babar2 = mirket.make('bindingBarAlt');

assert(babar1.foo.id !== babar2.foo.id);

// singleton
//
mirket.singleton('singletonBar', ({ bindingFoo }) => new Bar(bindingFoo));

/** @type Bar */
const sbar1 = mirket.make('singletonBar');
/** @type Bar */
const sbar2 = mirket.make('singletonBar');

assert(sbar1.id === sbar2.id);
// NOTE Even though 'bindingFoo' is not a singleton, since
//      'singletonBar' is singleton, each `make` result
//      has the same instance of 'bindingFoo'
assert(sbar1.foo.id === sbar2.foo.id);


// Baz
//
class Baz {
  constructor({ foo, singletonBar: bar }, message = null, id = null) {
    this.id = (id || getRandomInt());
    this.type = 'Baz';
    this.message = (message || `${foo.message} ${bar.message}`);
    /** @type Foo */
    this.foo = foo;
    /** @type Bar */
    this.bar = bar;
  }
}

// bind
//
mirket.bind('bindingBaz', ({ foo, singletonBar }) => new Baz({ foo, singletonBar }));

/** @type Baz */
const bbaz1 = mirket.make('bindingBaz');

assert(bbaz1.message === `${bbaz1.foo.message} ${bbaz1.bar.message}`);


mirket.bind('bindingBazClazz', Baz);

/** @type Baz */
const bbazc1 = mirket.make('bindingBazClazz');
/** @type Baz */
const bbazc2 = mirket.make('bindingBazClazz', 'can bind classes too');
/** @type Baz */
const bbazc3 = mirket.make('bindingBazClazz', null, 35);
/** @type Baz */
const bbazc4 = mirket.make('bindingBazClazz', { id: 35 });

assert(bbazc1.message === `${bbazc1.foo.message} ${bbazc1.bar.message}`);
assert(bbazc2.message === 'can bind classes too');
assert(bbazc3.message === `${bbazc3.foo.message} ${bbazc3.bar.message}`);
assert(bbazc3.id === 35);
assert(bbazc4.message === `${bbazc4.foo.message} ${bbazc4.bar.message}`);
assert(bbazc4.id === 35);


// aliases
//
mirket.alias('singletonBar', 'sinbar');

/** @type Bar */
const asbar1 = mirket.make('singletonBar');
/** @type Bar */
const asbar2 = mirket.make('sinbar');

assert(sbar1.id === asbar1.id);
assert(asbar1.id === asbar2.id);


console.log('Everything is OK');
