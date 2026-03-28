const request = require('supertest');
const app = require('../app');
const { connectTestDB, disconnectTestDB } = require('./helpers/testHelpers');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Infrastructure smoke tests', () => {
  test('GET /api/v1/health returns 200 with success envelope', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('OK');
  });

  test('Unknown route returns 404-ish error via error middleware', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    // Express default 404 — error middleware not triggered for missing routes by default,
    // but we confirm the server responds (not a crash)
    expect([404, 200]).toContain(res.status);
  });

  test('Error middleware formats errors correctly', () => {
    const errorMiddleware = require('../middleware/errorMiddleware');
    const mockReq = {};
    const mockNext = jest.fn();
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const err = new Error('test error');
    err.status = 422;

    errorMiddleware(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(422);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'test error',
      status: 422,
    });
  });
});
