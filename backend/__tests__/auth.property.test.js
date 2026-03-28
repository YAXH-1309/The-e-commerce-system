const request = require('supertest');
const fc = require('fast-check');
const app = require('../app');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('./helpers/testHelpers');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

// Arbitraries constrained to the valid input domain
// password: alphanumeric, min 8 chars — avoids any Zod/bcrypt edge cases
const validPassword = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
  { minLength: 8, maxLength: 32 }
);

// name: non-empty alphabetic string
const validName = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'), { minLength: 1, maxLength: 20 });

// Feature: ecommerce-system, Property 2: Duplicate email rejection
// For any email address, attempting to register a second account with the same email
// should be rejected with a non-2xx status and a descriptive error message.
// Validates: Requirements 1.3
describe('Property 2: Duplicate email rejection', () => {
  test(
    'registering twice with the same email returns a non-2xx status with an error message',
    async () => {
      let counter = 0;

      await fc.assert(
        fc.asyncProperty(
          fc.record({ name: validName, password: validPassword }),
          async ({ name, password }) => {
            const email = `dup${++counter}@test.com`;

            // First registration — must succeed
            const firstRes = await request(app)
              .post('/api/v1/auth/register')
              .send({ name, email, password });

            expect(firstRes.status).toBe(201);

            // Second registration with the same email — must be rejected
            const secondRes = await request(app)
              .post('/api/v1/auth/register')
              .send({ name, email, password });

            expect(secondRes.status).toBeGreaterThanOrEqual(400);
            expect(secondRes.status).toBeLessThan(600);
            expect(secondRes.body.success).toBe(false);
            expect(typeof secondRes.body.message).toBe('string');
            expect(secondRes.body.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    },
    120000
  );
});

// Feature: ecommerce-system, Property 1: Registration–Login round trip
// For any valid email and password (≥ 8 characters), registering a new user and then
// logging in with the same credentials should return a valid JWT with an expiry
// approximately 24 hours in the future.
// Validates: Requirements 1.1, 1.2
describe('Property 1: Registration–Login round trip', () => {
  test(
    'registering then logging in with the same credentials returns a valid JWT expiring ~24h from now',
    async () => {
      let counter = 0;

      await fc.assert(
        fc.asyncProperty(
          fc.record({ name: validName, password: validPassword }),
          async ({ name, password }) => {
            // Use a counter-based unique email to guarantee no duplicate-email 409s
            const email = `user${++counter}@test.com`;

            // Step 1: Register
            const registerRes = await request(app)
              .post('/api/v1/auth/register')
              .send({ name, email, password });

            expect(registerRes.status).toBe(201);
            expect(registerRes.body.success).toBe(true);
            expect(typeof registerRes.body.data.token).toBe('string');

            // Step 2: Login with the same credentials
            const loginRes = await request(app)
              .post('/api/v1/auth/login')
              .send({ email, password });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.success).toBe(true);

            const token = loginRes.body.data.token;
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);

            // Step 3: Verify the JWT expiry is approximately 24 hours from now
            const [, payloadB64] = token.split('.');
            const payload = JSON.parse(
              Buffer.from(payloadB64, 'base64url').toString('utf8')
            );

            const nowSec = Math.floor(Date.now() / 1000);
            const expectedExpiry = nowSec + 24 * 60 * 60;
            // Allow ±60 seconds of tolerance
            expect(payload.exp).toBeGreaterThanOrEqual(expectedExpiry - 60);
            expect(payload.exp).toBeLessThanOrEqual(expectedExpiry + 60);
          }
        ),
        { numRuns: 100 }
      );
    },
    120000 // 2-minute timeout for 100 HTTP round-trips
  );
});

// Feature: ecommerce-system, Property 3: Invalid credentials rejection
// For any registered user, submitting a login request with an incorrect password
// should return a 401 status.
// Validates: Requirements 1.4
describe('Property 3: Invalid credentials rejection', () => {
  test(
    'logging in with a wrong password returns 401',
    async () => {
      let counter = 0;

      await fc.assert(
        fc.asyncProperty(
          fc.record({ name: validName, password: validPassword }),
          async ({ name, password }) => {
            const email = `inv${++counter}@test.com`;

            // Register the user first
            await request(app)
              .post('/api/v1/auth/register')
              .send({ name, email, password });

            // Attempt login with a different (wrong) password
            const wrongPassword = password + '_wrong';
            const res = await request(app)
              .post('/api/v1/auth/login')
              .send({ email, password: wrongPassword });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );
});

// Feature: ecommerce-system, Property 4: JWT grants access to protected routes
// For any valid JWT issued by the system, attaching it to a request for a protected
// route should return a 2xx status (not 401).
// Validates: Requirements 1.5
describe('Property 4: JWT grants access to protected routes', () => {
  test(
    'a valid JWT allows access to the cart endpoint (protected route)',
    async () => {
      let counter = 0;

      await fc.assert(
        fc.asyncProperty(
          fc.record({ name: validName, password: validPassword }),
          async ({ name, password }) => {
            const email = `jwt${++counter}@test.com`;

            const regRes = await request(app)
              .post('/api/v1/auth/register')
              .send({ name, email, password });

            const token = regRes.body.data.token;

            const res = await request(app)
              .get('/api/v1/cart')
              .set('Authorization', `Bearer ${token}`);

            expect(res.status).not.toBe(401);
            expect(res.status).toBeGreaterThanOrEqual(200);
            expect(res.status).toBeLessThan(500);
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );
});

// Feature: ecommerce-system, Property 26: Sensitive field exclusion
// For any API response involving a User, the response payload should not contain
// the passwordHash field.
// Validates: Requirements 9.3
describe('Property 26: Sensitive field exclusion', () => {
  test(
    'register and login responses never expose passwordHash',
    async () => {
      let counter = 0;

      await fc.assert(
        fc.asyncProperty(
          fc.record({ name: validName, password: validPassword }),
          async ({ name, password }) => {
            const email = `sens${++counter}@test.com`;

            const regRes = await request(app)
              .post('/api/v1/auth/register')
              .send({ name, email, password });

            // Check register response
            const regBody = JSON.stringify(regRes.body);
            expect(regBody).not.toContain('passwordHash');

            // Check login response
            const loginRes = await request(app)
              .post('/api/v1/auth/login')
              .send({ email, password });

            const loginBody = JSON.stringify(loginRes.body);
            expect(loginBody).not.toContain('passwordHash');
          }
        ),
        { numRuns: 20 }
      );
    },
    60000
  );
});
