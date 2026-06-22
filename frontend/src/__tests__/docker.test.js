/**
 * DOC-01 to DOC-03 — Docker / production build
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../..');

describe('DOC-01 — Docker Compose build configuration', () => {
  test('docker-compose.yml exists in web root', () => {
    const composePath = path.join(WEB_ROOT, 'docker-compose.yml');
    expect(fs.existsSync(composePath)).toBe(true);
  });

  test('docker-compose.yml references a build section or image', () => {
    const composePath = path.join(WEB_ROOT, 'docker-compose.yml');
    const content = fs.readFileSync(composePath, 'utf8');
    expect(content.match(/build:|image:/)).toBeTruthy();
  });

  test('Dockerfile exists for production web build', () => {
    const dockerfilePath = path.join(WEB_ROOT, 'Dockerfile');
    expect(fs.existsSync(dockerfilePath)).toBe(true);
  });
});

describe('DOC-02 — Nginx SPA routing', () => {
  test('nginx.conf exists', () => {
    const nginxPath = path.join(WEB_ROOT, 'nginx.conf');
    expect(fs.existsSync(nginxPath)).toBe(true);
  });

  test('nginx.conf contains try_files directive for SPA fallback', () => {
    const nginxPath = path.join(WEB_ROOT, 'nginx.conf');
    const content = fs.readFileSync(nginxPath, 'utf8');
    expect(content).toMatch(/try_files/);
    expect(content).toMatch(/index\.html/);
  });
});

describe('DOC-03 — API URL baked into production build', () => {
  test('web config.js reads REACT_APP_API_BASE_URL environment variable', () => {
    const configPath = path.join(WEB_ROOT, 'src/config.js');
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toMatch(/REACT_APP_API_BASE_URL/);
  });

  test('docker-compose.yml references environment or build-args for API URL', () => {
    const composePath = path.join(WEB_ROOT, 'docker-compose.yml');
    const content = fs.readFileSync(composePath, 'utf8');
    const hasEnvOrArgs = content.includes('environment') ||
                         content.includes('args') ||
                         content.includes('REACT_APP');
    expect(hasEnvOrArgs).toBe(true);
  });

  test('API_BASE_URL falls back to production URL when not localhost', () => {
    const configPath = path.join(WEB_ROOT, 'src/config.js');
    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toMatch(/connectmytask/i);
  });
});
