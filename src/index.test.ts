import Koa, { Context } from 'koa';
import { end, lit, str } from 'fp-ts-routing';
import { Server } from 'http';
import request from 'supertest';

import { Router } from '.';

describe(Router, () => {
    describe(Router.prototype.get, () => {
        let server: Server;

        beforeAll(() => {
            const app = new Koa();

            // matches
            const root = end;
            const user = lit('users').then(str('id')).then(end);

            // routes
            const router = new Router();

            router.get(root, function (ctx) {
                ctx.body = 'Hello, world!';
            });

            router.get(user, function (ctx) {
                ctx.body = `Hello, ${ctx.params.id}!`;
            });

            app.use(router.routes());

            server = app.listen();
        });

        afterAll((done) => {
            server.close(done);
        });

        describe('GET /', () => {
            it('returns 200', async () => {
                await request(server)
                    .get('/')
                    .expect(200)
                    .expect('Hello, world!');
            });
        });

        describe('POST /', () => {
            it('returns 404', async () => {
                await request(server).post('/').expect(404);
            });
        });

        describe('GET /users/:id', () => {
            it('returns 200', async () => {
                await request(server)
                    .get('/users/foo')
                    .expect(200)
                    .expect('Hello, foo!');
            });
        });
    });

    describe(Router.prototype.post, () => {
        let server: Server;

        beforeAll(() => {
            const app = new Koa();

            // matches
            const root = end;

            // routes
            const router = new Router();

            router.post(root, function (ctx) {
                ctx.body = 'Hello, world!';
            });

            app.use(router.routes());

            server = app.listen();
        });

        afterAll((done) => server.close(done));

        describe('GET /', () => {
            it('returns 404', async () => {
                await request(server).get('/').expect(404);
            });
        });

        describe('POST /', () => {
            it('returns 200', async () => {
                await request(server).post('/').expect(200);
            });
        });
    });

    describe(Router.prototype.allowedMethods, () => {
        let server: Server;

        beforeAll(() => {
            const app = new Koa();

            // matches
            const root = end;

            // routes
            const router = new Router();

            function handler(ctx: Context) {
                ctx.body = 'root';
            }

            router.get(root, handler);
            router.post(root, handler);

            app.use(router.routes());
            app.use(router.allowedMethods());

            server = app.listen();
        });

        afterAll((done) => {
            server.close(done);
        });

        it('returns proper Allow header', async () => {
            await request(server)
                .options('/')
                .expect(200)
                .expect('Allow', 'GET, HEAD, POST')
                .expect('Content-Length', '0');
        });

        it('returns 200 for GET, which is allowed', async () => {
            await request(server)
                .get('/') // GET is allowed
                .expect(200);
        });

        it('returns 405 for PUT, which is not allowed', async () => {
            await request(server)
                .put('/') // PUT is not allowed
                .expect(405)
                // The server MUST generate an `Allow` header field in a 405 response containing a list of the target
                // resource's currently supported methods.
                // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
                .expect('Allow', 'GET, HEAD, POST');
        });

        it('returns 501 for TRACE, which is unknown', async () => {
            await request(server).trace('/').expect(501);
        });
    });

    describe(Router.prototype.redirect, () => {
        describe('w/o base path', () => {
            let server: Server;

            beforeAll(() => {
                const app = new Koa();

                // matches
                const oldUser = str('userID').then(end);
                const newUser = lit('users').then(str('id')).then(end);

                // routes
                const router = new Router();

                router.redirect(oldUser, newUser, ({ userID }) => ({
                    id: userID,
                }));

                app.use(router.routes());

                server = app.listen();
            });

            afterAll((done) => {
                server.close(done);
            });

            describe('GET /john', () => {
                it('returns 302', async () => {
                    await request(server)
                        .get('/john')
                        .redirects(0)
                        .expect(302)
                        .expect('Location', '/users/john');
                });
            });
        });

        describe('w/ base path', () => {
            let server: Server;

            beforeAll(() => {
                const app = new Koa();

                // matches
                const oldUser = str('userID').then(end);
                const newUser = lit('users').then(str('id')).then(end);

                // routes
                const router = new Router({
                    basePath: '/admin/',
                });

                router.redirect(oldUser, newUser, ({ userID }) => ({
                    id: userID,
                }));

                app.use(router.routes());

                server = app.listen();
            });

            afterAll((done) => {
                server.close(done);
            });

            describe('GET /john', () => {
                it('returns 302', async () => {
                    await request(server)
                        .get('/john')
                        .redirects(0)
                        .expect(302)
                        .expect('Location', '/admin/users/john');
                });
            });
        });
    });

    describe(Router.prototype.use, () => {
        let server: Server;

        beforeAll(() => {
            const app = new Koa();

            // matches
            const root = end;

            // routes
            const router = new Router();

            router.use(function auth(ctx, next) {
                const auth = ctx.headers['authorization'];

                if (typeof auth === 'undefined') {
                    ctx.status = 401;
                    return;
                }

                return next();
            });

            router.get(root, function handler(ctx: Context) {
                ctx.body = 'Hello, world!';
            });

            app.use(router.routes());

            server = app.listen();
        });

        afterAll((done) => {
            server.close(done);
        });

        it('returns 401 without Authorization header', async () => {
            await request(server).get('/').expect(401);
        });

        it('returns 200 with Authorization header', async () => {
            await request(server).get('/').auth('foo', 'bar').expect(200);
        });
    });
});
