import Koa from 'koa';
import { Middleware, Next, Context, ParameterizedContext } from 'koa';
import compose from 'koa-compose';
import { parse, Route, zero, Match, Parser, format } from 'fp-ts-routing';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PUT';

export class Router<StateT = Koa.DefaultState, CustomT = Koa.DefaultContext> {
    private readonly middlewares: Array<
        Middleware<StateT, CustomT & { params: unknown }>
    > = [];

    private readonly parsers: Record<
        Exclude<Method, 'OPTIONS'>,
        Parser<Middleware<StateT, Context & CustomT & { params: any }>>
    >;

    public constructor() {
        this.parsers = {
            DELETE: zero(),
            GET: zero(),
            HEAD: zero(),
            PATCH: zero(),
            POST: zero(),
            PUT: zero(),
        };
    }

    /**
     * Returns separate middleware for responding to `OPTIONS` requests with
     * an `Allow` header containing the allowed methods, as well as responding
     * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
     */
    public allowedMethods(): Middleware<StateT, Context & CustomT> {
        return async (
            ctx: ParameterizedContext<StateT, CustomT>,
            next: Next
        ): Promise<void> => {
            const method = this.parseMethod(ctx.method);

            if (method === null) {
                ctx.status = 501;
                return;
            }

            /**
             * A list of allowed methods on this endpoint
             */
            const allowedMethods = ([
                'DELETE',
                'GET',
                'HEAD',
                'PATCH',
                'POST',
                'PUT',
            ] as const).filter((m) => {
                const parser = this.parsers[m];
                const route = Route.parse(ctx.path);

                const match = parse(parser, route, null);

                return match !== null;
            });

            if (method === 'OPTIONS') {
                ctx.status = 200;
                ctx.body = '';
                ctx.set('Allow', allowedMethods.join(', '));
                return;
            }

            if (allowedMethods.includes(method)) {
                return next();
            }

            // current method is not allowed
            // 405 will be returned
            ctx.status = 405;
            ctx.set('Allow', allowedMethods.join(', '));
        };
    }

    public routes(): Middleware<
        StateT,
        Context & CustomT & { params: unknown }
    > {
        return (
            ctx: ParameterizedContext<StateT, CustomT & { params: unknown }>,
            next: Next
        ): any => {
            const method = this.parseMethod(ctx.method);

            // OPTIONS method is not supported by this middleware
            if (method === null || method === 'OPTIONS') {
                return next();
            }

            const parser = this.parsers[method];
            const route = Route.parse(ctx.path);
            const middleware = parse(parser, route, null);

            if (middleware === null) {
                return next();
            }

            const composed = this.compose([...this.middlewares, middleware]);

            return composed(ctx, next);
        };
    }

    /**
     * Add a route for DELETE method
     */
    public delete<Params>(
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        this.register('DELETE', match, middleware);
    }

    /**
     * Add a route for GET method
     */
    public get<Params>(
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        this.register('GET', match, middleware);
        this.register('HEAD', match, middleware);
    }

    /**
     * Add a route for PATCH method
     */
    public patch<Params>(
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        this.register('PATCH', match, middleware);
    }

    /**
     * Add a route for POST method
     */
    public post<Params>(
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        this.register('POST', match, middleware);
    }

    /**
     * Add a route for PUT method
     */
    public put<Params>(
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        this.register('PUT', match, middleware);
    }

    /**
     * Configure redirect from `src` to `dest`
     */
    public redirect<A, B>(
        src: Match<A>,
        dest: Match<B>,
        f: (a: A) => B,
        code: number = 302
    ): void {
        this.all(src, function (ctx) {
            const params = f(ctx.params);
            const path = format(dest.formatter, params);

            ctx.redirect(path);
            ctx.status = code;
        });
    }

    /**
     * Enable the given middleware over all the routes
     */
    public use(middleware: Middleware<StateT, CustomT>): void {
        this.middlewares.push(middleware);
    }

    private all<Params>(
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        (['DELETE', 'GET', 'PATCH', 'POST', 'PUT'] as const).forEach(
            (method) => {
                this.register(method, match, middleware);
            }
        );
    }

    /**
     * Compose multiple middlewares into one with proper typing
     */
    private compose(
        middlewares: Array<Middleware<StateT, CustomT & { params: unknown }>>
    ): Middleware<StateT, CustomT & { params: unknown }> {
        return compose(middlewares) as any;
    }

    private register<Params>(
        method: Exclude<Method, 'OPTIONS'>,
        match: Match<Params>,
        middleware: Middleware<StateT, Context & CustomT & { params: Params }>
    ): void {
        const parser = match.parser.map(
            (params: Params) =>
                function (
                    ctx: ParameterizedContext<
                        StateT,
                        CustomT & { params: Params }
                    >,
                    next: Next
                ) {
                    ctx.params = params;
                    return middleware(ctx, next);
                }
        );
        this.parsers[method] = this.parsers[method].alt(parser);
    }

    private parseMethod(str: string): Method | null {
        switch (str) {
            case 'DELETE':
            case 'GET':
            case 'HEAD':
            case 'OPTIONS':
            case 'PATCH':
            case 'PUT':
            case 'POST':
                return str;
            default:
                return null;
        }
    }
}
