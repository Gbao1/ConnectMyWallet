# Device Fingerprinting Integration Guide

This guide explains how to use the backend device fingerprinting pipeline for web (React + Fingerprint.js) and mobile (Flutter + Device Info Plus).

## What is implemented in backend

The backend now supports:

- Persisting device fingerprints per user
- Fraud flagging when one fingerprint is shared across multiple accounts
- Suspicious activity logging
- Admin fraud dashboard endpoints to inspect flagged users and shared device graphs

Main backend files:

- `server/services/deviceFingerprintService.js`
- `server/models/User.js`
- `server/controllers/authController.js`
- `server/controllers/googleLoginController.js`
- `server/controllers/facebookLoginController.js`
- `server/routes/authRoutes.js`
- `server/controllers/adminController.js`
- `server/routes/adminRoutes.js`

## Environment variables

Add these variables in `server/.env`:

```env
# Existing
MONGO_URI=<your_mongodb_uri>
JWT_SECRET=<your_jwt_secret>

# Optional fraud threshold (default: 3)
FRAUD_SHARED_DEVICE_ACCOUNT_THRESHOLD=3
```

## Accepted fingerprint payload fields

Backend accepts fingerprint from any of these fields:

- `deviceFingerprint`
- `fingerprintId`
- `visitorId`
- `deviceId`
- `device.id`

Optional metadata fields:

- `platform`: `web` | `mobile`
- `deviceSource`
- `device.platform`
- `device.source`
- request `User-Agent` and IP are captured automatically

## Backend endpoints

### 1) Capture during auth (recommended)

Send fingerprint fields in these existing auth calls:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/facebook`

### 2) Explicit sync endpoint

- `POST /api/auth/device-fingerprint`
- Auth required (`Authorization` header with JWT)

Request example:

```json
{
  "deviceFingerprint": "fp_web_3bf8d4a6",
  "platform": "web",
  "deviceSource": "fingerprintjs"
}
```

Response example:

```json
{
  "msg": "Device fingerprint captured",
  "fingerprintId": "fp_web_3bf8d4a6",
  "linkedAccountCount": 1,
  "flagged": false,
  "fraudFlags": {
    "isFlagged": false,
    "reasonCodes": [],
    "flaggedAt": null,
    "lastEvaluatedAt": "2026-04-03T..."
  }
}
```

## Admin fraud dashboard endpoints

All admin endpoints require admin JWT.

### Flagged accounts view

- `GET /api/admin/fraud/flagged-accounts`

Returns users with `fraudFlags.isFlagged = true` plus their device fingerprints.

### Shared device network view

- `GET /api/admin/fraud/device-network?minSharedAccounts=2`

Returns fingerprint clusters used by multiple accounts.

## React integration (Fingerprint.js)

Install:

```bash
npm install @fingerprintjs/fingerprintjs
```

Example helper:

```javascript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export async function getWebFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return {
    deviceFingerprint: result.visitorId,
    platform: 'web',
    deviceSource: 'fingerprintjs',
  };
}
```

Use in login/register request body:

```javascript
const fpData = await getWebFingerprint();

await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    password,
    ...fpData,
  }),
});
```

## Flutter integration (Device Info Plus)

Install:

```bash
flutter pub add device_info_plus
flutter pub add crypto
```

Example fingerprint utility (stable hash approach):

```dart
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';

Future<Map<String, dynamic>> getMobileFingerprint() async {
  final deviceInfo = DeviceInfoPlugin();

  String raw;
  if (Platform.isAndroid) {
    final android = await deviceInfo.androidInfo;
    raw = '${android.brand}|${android.model}|${android.id}|${android.hardware}|${android.fingerprint}';
  } else if (Platform.isIOS) {
    final ios = await deviceInfo.iosInfo;
    raw = '${ios.name}|${ios.model}|${ios.systemName}|${ios.systemVersion}|${ios.identifierForVendor}';
  } else {
    raw = 'unknown-mobile-device';
  }

  final hash = sha256.convert(utf8.encode(raw)).toString();

  return {
    'deviceFingerprint': hash,
    'platform': 'mobile',
    'deviceSource': 'device_info_plus',
  };
}
```

Send in API requests:

```dart
final fpData = await getMobileFingerprint();

await dio.post('/api/auth/login', data: {
  'email': email,
  'password': password,
  ...fpData,
});
```

## Fraud behavior summary

When fingerprint is captured:

1. Backend upserts fingerprint in `user.deviceFingerprints`
2. Backend checks how many accounts share this fingerprint
3. If shared count >= `FRAUD_SHARED_DEVICE_ACCOUNT_THRESHOLD`:
   - all linked users are flagged
   - reason code `shared_device_fingerprint` is added
   - suspicious activity is logged

## Testing checklist

- [ ] Send login/register with fingerprint from web
- [ ] Send login/register with fingerprint from mobile
- [ ] Confirm `deviceFingerprints` is saved in user record
- [ ] Reuse same fingerprint across multiple accounts
- [ ] Confirm users become flagged after threshold
- [ ] Verify admin endpoints return expected fraud data

## Security and privacy notes

- Never store raw secrets in client payload.
- Fingerprints are probabilistic identifiers; do not rely on them as sole proof.
- Use fingerprint signal with rate limiting, IP heuristics, and behavioral rules.
- Ensure legal/privacy compliance for your deployment region.
