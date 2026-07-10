const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    email: { type: 'string', format: 'email', example: 'hunter@example.com' },
  },
  required: ['id', 'email'],
} as const;

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string', example: 'Invalid email or password.' },
  },
  required: ['error'],
} as const;

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Treasure Hunt Game API',
    version: '1.0.0',
    description:
      'Auth and score-tracking API for the Treasure Hunt game. Auth uses a JWT carried in an ' +
      'httpOnly `auth_token` cookie set by /auth/signup and /auth/signin (signed HS256, 30-day ' +
      'expiry, revocable on sign-out via a server-side denylist) — the Swagger UI "Authorize" ' +
      'button is not needed; just call signin here first and the browser will carry the cookie ' +
      'on subsequent "Try it out" requests.',
  },
  servers: [{ url: '/api', description: 'Same-origin API (proxied by Vite in dev)' }],
  tags: [
    { name: 'auth', description: 'Signup, signin, signout, and session lookup' },
    { name: 'scores', description: "Signed-in user's game score history" },
  ],
  components: {
    securitySchemes: {
      jwtCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth_token',
        description: 'httpOnly cookie holding a signed JWT, issued by /auth/signup or /auth/signin.',
      },
    },
    schemas: {
      User: userSchema,
      Error: errorSchema,
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['auth'],
        summary: 'Create an account and start a session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, example: 'hunter2pass' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Account created; session cookie set.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: userSchema }, required: ['user'] },
              },
            },
          },
          '400': { description: 'Invalid email or password too short.', content: { 'application/json': { schema: errorSchema } } },
          '409': { description: 'Email already registered.', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/auth/signin': {
      post: {
        tags: ['auth'],
        summary: 'Sign in and start a session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Signed in; session cookie set.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { user: userSchema }, required: ['user'] },
              },
            },
          },
          '400': { description: 'Missing email or password.', content: { 'application/json': { schema: errorSchema } } },
          '401': { description: 'Invalid credentials.', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/auth/signout': {
      post: {
        tags: ['auth'],
        summary: 'End the current session',
        security: [{ jwtCookie: [] }],
        responses: {
          '204': { description: 'Session cleared (no content).' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Get the currently signed-in user, if any',
        security: [{ jwtCookie: [] }],
        responses: {
          '200': {
            description: '`user` is null when there is no valid session.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { oneOf: [userSchema, { type: 'null' }] } },
                  required: ['user'],
                },
              },
            },
          },
        },
      },
    },
    '/scores': {
      post: {
        tags: ['scores'],
        summary: 'Record a completed game result',
        description: 'Requires an active session. Guest play is never recorded.',
        security: [{ jwtCookie: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  score: { type: 'number', example: 100 },
                  result: { type: 'string', enum: ['WIN', 'TIE', 'LOSS'] },
                },
                required: ['score', 'result'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Score recorded.',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } },
              },
            },
          },
          '400': { description: 'Missing/invalid score or result.', content: { 'application/json': { schema: errorSchema } } },
          '401': { description: 'Sign in required.', content: { 'application/json': { schema: errorSchema } } },
        },
      },
      get: {
        tags: ['scores'],
        summary: "List the signed-in user's score history (paginated)",
        security: [{ jwtCookie: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: '1-indexed page number. Defaults to 1; non-positive/invalid values fall back to 1.',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Rows per page. Defaults to 10, capped at 50.',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'Scores ordered most recent first, for the requested page.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    scores: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          score: { type: 'number' },
                          result: { type: 'string', enum: ['WIN', 'TIE', 'LOSS'] },
                          played_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', example: 1 },
                        pageSize: { type: 'integer', example: 10 },
                        total: { type: 'integer', example: 23 },
                        totalPages: { type: 'integer', example: 3 },
                      },
                      required: ['page', 'pageSize', 'total', 'totalPages'],
                    },
                  },
                  required: ['scores', 'pagination'],
                },
              },
            },
          },
          '401': { description: 'Sign in required.', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
  },
} as const;
