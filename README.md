# koa-fp-ts-router

![npm](https://img.shields.io/npm/v/koa-fp-ts-router)

A [Koa](https://koajs.com/) router middleware built on the top of [`fp-ts-routing`](https://www.npmjs.com/package/fp-ts-routing).

## Installation

Note that these packages are peer dependencies of this library, which need to be installed separately.

- [`fp-ts`](https://www.npmjs.com/package/fp-ts)
- [`fp-ts-routing`](https://www.npmjs.com/package/fp-ts-routing)
- [`io-ts`](https://www.npmjs.com/package/io-ts)
- [`koa`](https://www.npmjs.com/package/koa)

### Using [`npm`](https://www.npmjs.com/)

```
$ npm install koa-fp-ts-router
```

### Using [`yarn`](https://yarnpkg.com/)

```
$ yarn add koa-fp-ts-router
```

## Usage

```typescript
import { end, lit, str } from 'fp-ts-routing';
import Koa from 'koa';
import { Router } from 'koa-fp-ts-router';

const app = new Koa();

// matches
const root = end; // `/`
const user = lit('users').then(str('id')).then(end); // `/users/:id`

// routes
const router = new Router();

router.get(root, function (ctx) {
  ctx.body = 'Hello, world!';
});

router.get(user, function (ctx) {
  ctx.body = `Hello, ${ctx.params.id}!`;
});

// Use the router middleware
app.use(router.routes());

app.listen(3000);
```
