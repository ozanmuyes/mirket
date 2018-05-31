# Mirket

> Kernel on-steroids for your next Node.js application

Boot your application via service providers and give control to your application again right after. It has a container, but does **not** meant to be a inversion of control (also known as IoC container) although it can inject and resolve dependencies. Mirket is merely an accompanying library for developers to build their applications without hassle of directory structure and managing instances through out the project without polluting the global scope. It is the versatile central that stays out of your way on your next Node.js application.

_Disclaimer: There is a package named 'meerkat' in the npm registry. Except phonetic similarity there is no relation between 'mirket' and 'meerkat'. Mirket is an existing word in Turkish language (although it translates to 'meerkat'), there is no any intention to create confusion for 'meerkat' users._

## Installation

Mirket requires **Node.js version 7.6.0** or higher due to it's extensive usage
of ES6 features.

```bash
$ npm install mirket
```

## Basic Usage

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
