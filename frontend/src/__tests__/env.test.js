/**
 * ENV-01 to ENV-04 — Test environment prerequisites (web app side).
 * These verify config, package scripts, and Docker setup within Web-connectmytask.
 * Server-side checks belong in the ConnectMyTask/server test suite.
 */

const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../..');

describe('ENV-01 — API base URL is configured', () => {
  test('config.js exports API_BASE_URL with a localhost fallback', () => {
    const configPath = path.join(WEB_ROOT, 'src/config.js');
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toMatch(/API_BASE_URL/);
    expect(content).toMatch(/4000/);
  });

  test('config.js reads REACT_APP_API_BASE_URL from env', () => {
    const content = fs.readFileSync(path.join(WEB_ROOT, 'src/config.js'), 'utf8');
    expect(content).toMatch(/REACT_APP_API_BASE_URL/);
  });
});

describe('ENV-02 — Backend API connection config is present', () => {
  test('config.js contains production API hostname', () => {
    const content = fs.readFileSync(path.join(WEB_ROOT, 'src/config.js'), 'utf8');
    expect(content).toMatch(/connectmytask/i);
  });

  test('api/client.js uses API_BASE_URL from config', () => {
    const clientPath = path.join(WEB_ROOT, 'src/api/client.js');
    expect(fs.existsSync(clientPath)).toBe(true);
    const content = fs.readFileSync(clientPath, 'utf8');
    expect(content).toMatch(/API_BASE_URL/);
  });
});

describe('ENV-03 — Web app start script configured', () => {
  test('package.json has start script', () => {
    const pkgPath = path.join(WEB_ROOT, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(pkg.scripts.start).toBeDefined();
  });

  test('package.json has test script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(WEB_ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.test).toBeDefined();
  });
});

describe('ENV-04 — Docker / production build configured', () => {
  test('docker-compose.yml exists in web root', () => {
    expect(fs.existsSync(path.join(WEB_ROOT, 'docker-compose.yml'))).toBe(true);
  });

  test('nginx.conf exists for SPA serving', () => {
    expect(fs.existsSync(path.join(WEB_ROOT, 'nginx.conf'))).toBe(true);
  });

  test('Dockerfile exists', () => {
    expect(fs.existsSync(path.join(WEB_ROOT, 'Dockerfile'))).toBe(true);
  });
});
