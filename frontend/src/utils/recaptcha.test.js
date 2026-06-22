import { assertRecaptchaBeforeAuth, getRecaptchaToken } from './recaptcha';

jest.mock('../config', () => ({
  API_BASE_URL: 'http://localhost:4000',
  RECAPTCHA_SITE_KEY: 'site-key',
  RECAPTCHA_VERIFY_ENABLED: true,
}));

describe('recaptcha utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, REACT_APP_DISABLE_RECAPTCHA: 'false' };
    Object.defineProperty(window, 'grecaptcha', {
      configurable: true,
      value: {
        execute: jest.fn().mockResolvedValue('token-1'),
        ready: (cb) => cb(),
      },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('getRecaptchaToken returns token from grecaptcha', async () => {
    await expect(getRecaptchaToken('login')).resolves.toBe('token-1');
    expect(window.grecaptcha.execute).toHaveBeenCalledWith('site-key', { action: 'login' });
  });

  test('assertRecaptchaBeforeAuth resolves when token can be generated', async () => {
    await expect(assertRecaptchaBeforeAuth('login')).resolves.toBeUndefined();
  });
});
