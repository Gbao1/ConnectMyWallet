const express = require("express");
const request = require("supertest");

function buildApp(envOverrides = {}) {
  const keys = [
    "ANDROID_PACKAGE_NAME",
    "ANDROID_SHA256_CERT_FINGERPRINT",
    "IOS_TEAM_ID",
    "IOS_BUNDLE_ID",
  ];
  const saved = {};
  keys.forEach((k) => {
    saved[k] = process.env[k];
    if (envOverrides[k] !== undefined) process.env[k] = envOverrides[k];
    else delete process.env[k];
  });
  const deepLinkRoutes = require("../routes/deepLinkRoutes");
  const app = express();
  app.use("/.well-known", deepLinkRoutes);
  return { app, restore: () => keys.forEach((k) => { process.env[k] = saved[k]; }) };
}

describe("GET /.well-known/assetlinks.json", () => {
  beforeEach(() => jest.resetModules());

  test("200 with correct structure when env vars set", async () => {
    const { app, restore } = buildApp({
      ANDROID_PACKAGE_NAME: "com.example.app",
      ANDROID_SHA256_CERT_FINGERPRINT: "AB:CD:EF:01",
    });
    const res = await request(app).get("/.well-known/assetlinks.json");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body[0].relation).toContain("delegate_permission/common.handle_all_urls");
    expect(res.body[0].target.namespace).toBe("android_app");
    expect(res.body[0].target.package_name).toBe("com.example.app");
    expect(res.body[0].target.sha256_cert_fingerprints).toContain("AB:CD:EF:01");
    restore();
  });

  test("503 when ANDROID_PACKAGE_NAME missing", async () => {
    const { app, restore } = buildApp({ ANDROID_SHA256_CERT_FINGERPRINT: "AB:CD:EF:01" });
    const res = await request(app).get("/.well-known/assetlinks.json");
    expect(res.status).toBe(503);
    restore();
  });

  test("503 when ANDROID_SHA256_CERT_FINGERPRINT missing", async () => {
    const { app, restore } = buildApp({ ANDROID_PACKAGE_NAME: "com.example.app" });
    const res = await request(app).get("/.well-known/assetlinks.json");
    expect(res.status).toBe(503);
    restore();
  });
});

describe("GET /.well-known/apple-app-site-association", () => {
  beforeEach(() => jest.resetModules());

  test("200 with correct AASA structure when env vars set", async () => {
    const { app, restore } = buildApp({
      IOS_TEAM_ID: "ABCDE12345",
      IOS_BUNDLE_ID: "com.example.app",
    });
    const res = await request(app).get("/.well-known/apple-app-site-association");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.applinks).toBeDefined();
    expect(res.body.applinks.details[0].appID).toBe("ABCDE12345.com.example.app");
    expect(res.body.applinks.details[0].paths).toContain("*");
    restore();
  });

  test("503 when IOS_TEAM_ID missing", async () => {
    const { app, restore } = buildApp({ IOS_BUNDLE_ID: "com.example.app" });
    const res = await request(app).get("/.well-known/apple-app-site-association");
    expect(res.status).toBe(503);
    restore();
  });

  test("503 when IOS_BUNDLE_ID missing", async () => {
    const { app, restore } = buildApp({ IOS_TEAM_ID: "ABCDE12345" });
    const res = await request(app).get("/.well-known/apple-app-site-association");
    expect(res.status).toBe(503);
    restore();
  });

  test("404 for .json extension (iOS rejects the .json URL variant)", async () => {
    const { app, restore } = buildApp({
      IOS_TEAM_ID: "ABCDE12345",
      IOS_BUNDLE_ID: "com.example.app",
    });
    const res = await request(app).get("/.well-known/apple-app-site-association.json");
    expect(res.status).toBe(404);
    restore();
  });
});
