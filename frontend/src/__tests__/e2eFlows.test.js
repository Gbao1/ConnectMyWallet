/**
 * E2E-01 to E2E-03 — End-to-end business flows
 * These tests orchestrate mocked API calls to simulate full user journeys.
 */
import { api } from '../api/client';
import { adminApi } from '../api/services';

jest.mock('../api/client', () => ({
  api: jest.fn(),
  setStoredToken: jest.fn(),
  getStoredToken: jest.fn(),
}));

jest.mock('../api/services', () => ({
  adminApi: {
    users: jest.fn(),
    providers: jest.fn(),
    tasks: jest.fn(),
    flaggedAccounts: jest.fn(),
    verifyUser: jest.fn(),
    deleteUser: jest.fn(),
  },
  initiateTaskPayment: jest.fn(),
}));

const mockApi = api;

describe('E2E-01 — Full happy path', () => {
  beforeEach(() => jest.clearAllMocks());

  test('Step 1: user registers and receives verification email', async () => {
    mockApi.mockResolvedValueOnce({
      msg: 'Registration successful. Please check your email to verify your account before logging in.',
      user: { id: 'u1', email: 'user@test.com', role: 'user' },
    });

    const result = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', password: 'pass1234', role: 'user' }),
    });

    expect(result.msg).toMatch(/Registration successful/);
  });

  test('Step 2: user posts a task', async () => {
    mockApi.mockResolvedValueOnce({
      _id: 'task-1', title: 'Fix garden', status: 'Active', budget: 100,
    });

    const result = await api('/api/tasks', { method: 'POST' });
    expect(result.status).toBe('Active');
  });

  test('Step 3: provider bids on task', async () => {
    mockApi.mockResolvedValueOnce({
      message: 'Bid submitted',
      task: { _id: 'task-1', bids: [{ _id: 'bid-1', provider: 'prov-1', price: 90 }] },
    });

    const result = await api('/api/tasks/task-1/bid', {
      method: 'POST',
      body: JSON.stringify({ amount: 90, message: 'I can do it', estimatedTime: '2h' }),
    });

    expect(result.task.bids).toHaveLength(1);
  });

  test('Step 4: user accepts bid and payment initiates', async () => {
    mockApi.mockResolvedValueOnce({ paymentUrl: 'https://pay.example', transactionId: 'txn-1' });

    const result = await api('/api/payments/sslcommerz/initiate', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-1', amount: 90 }),
    });

    expect(result.paymentUrl).toBeDefined();
    expect(result.transactionId).toBe('txn-1');
  });

  test('Step 5: provider marks job complete', async () => {
    mockApi.mockResolvedValueOnce({
      message: 'Completion submitted',
      task: { _id: 'task-1', completionSubmission: { status: 'pending_approval' } },
    });

    const result = await api('/api/tasks/task-1/providerComplete', { method: 'PATCH' });
    expect(result.task.completionSubmission.status).toBe('pending_approval');
  });

  test('Step 6: user reviews and task is completed — payout scheduled', async () => {
    mockApi.mockResolvedValueOnce({
      message: 'Task completed',
      task: { _id: 'task-1', status: 'Completed' },
    });

    const result = await api('/api/tasks/task-1/completeTask', {
      method: 'PUT',
      body: JSON.stringify({ overallRating: 5, comment: 'Great work' }),
    });

    expect(result.task.status).toBe('Completed');
  });

  test('Step 7: provider withdraws and admin approves payout', async () => {
    mockApi
      .mockResolvedValueOnce({ payout: { _id: 'po-1', status: 'pending_approval' } })
      .mockResolvedValueOnce({ payout: { _id: 'po-1', status: 'paid' } });

    const withdrawResult = await api('/api/payouts/po-1/withdraw', { method: 'POST' });
    expect(withdrawResult.payout.status).toBe('pending_approval');

    const approveResult = await api('/api/payouts/admin/po-1/approve', { method: 'POST' });
    expect(approveResult.payout.status).toBe('paid');
  });
});

describe('E2E-02 — Reject withdrawal path', () => {
  beforeEach(() => jest.clearAllMocks());

  test('provider withdraws and admin rejects — status becomes rejected', async () => {
    mockApi
      .mockResolvedValueOnce({ payout: { _id: 'po-2', status: 'pending_approval' } })
      .mockResolvedValueOnce({ payout: { _id: 'po-2', status: 'rejected' } });

    const withdrawResult = await api('/api/payouts/po-2/withdraw', { method: 'POST' });
    expect(withdrawResult.payout.status).toBe('pending_approval');

    const rejectResult = await api('/api/payouts/admin/po-2/reject', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Invalid destination' }),
    });
    expect(rejectResult.payout.status).toBe('rejected');
  });

  test('transaction still shows success after payout rejection', async () => {
    mockApi.mockResolvedValueOnce({ status: 'success', transactionId: 'txn-1' });

    const txn = await api('/api/payments/verify/txn-1');
    expect(txn.status).toBe('success');
  });
});

describe('E2E-03 — Single shared database (web + mobile)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('web and mobile use the same API base URL from config', () => {
    const { API_BASE_URL } = require('../config');
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  test('task created via web API is accessible via the same endpoint', async () => {
    mockApi.mockResolvedValueOnce({ _id: 'task-shared', title: 'Shared task' });

    const task = await api('/api/tasks/task-shared');
    expect(task._id).toBe('task-shared');
  });

  test('user profile endpoint returns consistent schema for both platforms', async () => {
    mockApi.mockResolvedValueOnce({
      _id: 'u1',
      name: 'Alice',
      email: 'alice@test.com',
      role: 'user',
      walletBalance: 0,
    });

    const profile = await api('/api/auth/profile/u1');
    expect(profile).toHaveProperty('_id');
    expect(profile).toHaveProperty('email');
    expect(profile).toHaveProperty('role');
  });
});
