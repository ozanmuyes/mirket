// TODO develop branch'ine commit oluştur. see ~/Desktop/mirket_changes.zip file

# Mirket

> Kernel on-steroids for your next Node.js application

Boot your application via [providers](#providers) and give control to your application again right after, or don't - it's up to you. It has it's own container, but that does not you must inverse the control of your application, although it can inject and resolve dependencies.

Mirket is merely an accompanying library for developers to build their applications (even frameworks) without hassle of directory structure and managing instances (also singletons) through out the project without polluting the global scope. It is the versatile central that stays out of your way on your next Node.js application (or framework).

_Disclaimer: There is a package named 'meerkat' in the npm registry. Except phonetic similarity there is no relation between 'mirket' and 'meerkat'. Mirket is an existing word in Turkish language (although it translates to 'meerkat'), there is no any intention to create confusion for 'meerkat' users._

## Installation

Mirket requires **Node.js version 7.6.0** or higher due to it's extensive usage
of ES6 features.

```bash
$ npm install mirket
```

## Basic Usage

Let's say you have TODO simple example'ı anlat

## Providers

Providers might as well be named as _service providers_ but to avoid limiting the developers' mind-set and providers' use-cases they has been called as just providers. They can provide many things beyond services; actually they can do everything and anything that one can do with Node.js - nothing more, nothing less. The importance of them is to put _something_ into, configure it and get _it_ back when needed. It's also smart enough to sort the providers at the `register` and `boot` phases. Best of all it lets the developer to be organized.

A provider is merely a JavaScript file that exports an object. That object may have some special keys which as follows;

 Name | Type | Note
------|------|-----
`name`|`string`|Name of the provider. If not specified the name is going to be obtained from the filename.
`disable`|`boolean`|If set to `true` that provider is not going to be taken into account (as if it doesn't exists in the first place)
`register`|`Function`|The function to register bindings. It will be injected some of the Mirket functions when needed (see [here](#Register Function)).
`boot`|`Function`|The function to configure existing bindings and further register bindings. It will be injected some of the Mirket functions when needed (see [here](#Boot Function)).
`defer`|`boolean`|If set to `true` indicates to Mirket that this provider must come after all non-deferred providers has been booted.

Before further ado here is a simple example;

```js
// sample-provider.js
module.exports = {
  register({ instance }) {
    const foo = 'foo';
    const bar = 'bar';

    instance('theFoo', foo);
    instance('theBar', bar);
  },
  boot({ theFoo, theBar }, { instance }) {
    const foobar = `${theFoo}${theBar}`;

    instance('theFooBar', foobar);
  },
};
```

```js
// index.js
const kernel = require('mirket')({
  rootPath: __dirname,
  providersPath: './',
});

kernel.boot();

const boundFoobar = kernel.make('theFooBar');

console.log(boundFoobar); // > foobar
```

In the provider file above (`sample-provider.js`) we've registered 2 instances; `theFoo` and `theBar`. ...


This example uses [Koa](https://github.com/koajs/koa) framework, but other
examples may be reached out [here](https://github.com/ozanmuyes/mirket-examples).

The following example creates a Koa application and starts the server using Mirket. Original code may be found [here](http://koajs.com/#cascading).

```js
// index.js

const kernel = require('mirket')({
  rootPath: __dirname,
  providersPath: 'app/providers'
});

kernel.boot().then(() => {
  console.log('Kernel has been booted.');
});
```

```js
// app/providers/server.js

module.exports = {
  register: ({ singleton }) => {
    const Koa = require('koa');

    singleton('app', () => new Koa());
  },
  defer: true,
  boot: ({ app }, { instance }) => {
    const server = app.listen(3000);

    instance('server', server);
  }
};
```

```js
// app/providers/middlewares/x-response-time.js

module.exports = {
  boot: ({ app }) => {
    app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      ctx.set('X-Response-Time', `${ms}ms`);
    });
  }
};
```

```js
// app/providers/middlewares/logger.js

module.exports = {
  boot: ({ app }) => {
    app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log(`${ctx.method} ${ctx.url} - ${ms}`);
    });
  }
};
```

OK it's not that 'basic' as of now, remember with great power comes great responsibility. The good thing about this example is that all there is to it, you have just seen most important aspects of the library. And once you wrap your head around it won't seem complex and twisted, Promise. Then you too can see reasons behind Mirket, which as follows;

- It encourages single responsibility principle, hence separated service provider files.
- It supports lazy loading, therefore `singleton` used in the `register` function of the server provider to bind (instead of `instance`). It (the binding, `Koa`) won't be instantiated until it's first TODO.
- Register functions of providers are meant to bind things to container, therefore the first (and one and only) parameter provides such functions.
- On the other hand boot functions of providers are more versatile. TODO inject and bind...

NOTE: `async` keyword on `boot` functions of providers is merely for control the
flow, on booting phase providers (actually `boot` functions of providers) will
run **sequentially**.
