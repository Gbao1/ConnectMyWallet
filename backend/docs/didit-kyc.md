# KYC Verification (DIDIT)

## How It Works

DIDIT is a third-party identity verification service. We send users to DIDIT's platform to verify their identity (passport, ID, etc.), and DIDIT redirects them back to our server with the result.

### Flow

```
Frontend                    Backend                         DIDIT
   │                          │                               │
   │  POST /api/kyc/didit/    │                               │
   │  start/:userId           │                               │
   │ ────────────────────────> │                               │
   │                          │  Saves kyc.status = "pending" │
   │   { redirectUrl }        │  in MongoDB                   │
   │ <──────────────────────── │                               │
   │                          │                               │
   │  User opens redirectUrl  │                               │
   │ ─────────────────────────────────────────────────────────>│
   │                          │                               │
   │                          │    User completes passport    │
   │                          │    verification on DIDIT      │
   │                          │                               │
   │                          │  GET /api/kyc/didit/callback  │
   │                          │  ?verificationSessionId=xxx   │
   │                          │  &status=Approved             │
   │                          │ <──────────────────────────── │
   │                          │                               │
   │                          │  Updates user in MongoDB:     │
   │                          │  kyc.status = "verified"      │
   │                          │  isVerified = true            │
   │                          │                               │
   │  Redirect to FRONTEND_URL│                               │
   │ <──────────────────────── │                               │
```

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/kyc/settings/:userId` | JWT | Get current KYC status for a user |
| POST | `/api/kyc/didit/start/:userId` | JWT | Start verification, returns DIDIT redirect URL |
| GET | `/api/kyc/didit/callback` | Public | DIDIT redirects here after verification |

### User Model (kyc field)

```
kyc: {
  provider: "didit" | "manual" | null
  status: "not_started" | "pending" | "verified" | "failed"
  diditWorkflowUrl: string
  diditWorkflowId: string
  verificationId: string        ← our internal session ID
  diditSessionId: string        ← DIDIT's session ID (from callback)
  lastRedirectAt: Date
  lastVerifiedAt: Date
}
```

### Environment Variables

```env
DIDIT_WORKFLOW_URL=https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA
DIDIT_WORKFLOW_ID=8f9856c5-eee8-44fc-87a9-9ccf75776f34
SERVER_BASE_URL=http://localhost:5001
FRONTEND_URL=http://localhost:3000
```

### DIDIT Dashboard Setup

Set the **redirect/callback URL** in your DIDIT workflow to:
```
https://<your-ngrok-or-production-url>/api/kyc/didit/callback
```

For local development, use ngrok to expose your server:
```bash
ngrok http 5001 # same port as your backend
# Then use the ngrok URL in DIDIT dashboard
```

---

## Backend Testing (Step by Step)

### Prerequisites
- Server running (`npm run dev`)
- A valid JWT token (login via `/api/auth/login`)
- A valid user ID from MongoDB

### Option A: Using Swagger UI

1. Open `http://localhost:5001/api-docs`
2. Click **Authorize** and paste your JWT token
3. You can check user KYC status by calling this endpoint : ``
4. Initiates User KYC
   - call `api/kyc/didit/start/<your_user_id>`
   - check mongoDB, you should see KYC status for that user is `pending`
   - now copy redirectURL from response
5. Open redirectURL in another tab
6. Complete KYC verification
7. Once completed, it should redirect to front end page.
8. Look at mongoDB again, status should be `verified` now.

---

## Frontend Integration Guide

### Overview

The frontend needs to do 3 things:
1. Check the user's current KYC status
2. Open the DIDIT verification page when user wants to verify
3. Handle the redirect back from DIDIT after verification

After verification, the backend redirects the user's browser to `FRONTEND_URL?kyc_status=verified` (or `kyc_status=failed`). The frontend should read this query param and show the appropriate message.

### API Calls

**1. Get KYC Status**
```
GET /api/kyc/settings/:userId
Header: Authorization: <jwt_token>
```

Response:
```json
{
  "userId": "6980de901ee57daac7f2057b",
  "name": "John Smith",
  "email": "john@example.com",
  "isVerified": false,
  "kyc": {
    "status": "not_started",
    "provider": null
  },
  "didit": {
    "workflowUrl": "https://verify.didit.me/u/...",
    "workflowId": "8f9856c5-..."
  }
}
```

**2. Start Verification**
```
POST /api/kyc/didit/start/:userId
Header: Authorization: <jwt_token>
```

Response:
```json
{
  "msg": "KYC verification started",
  "verificationId": "some-uuid",
  "redirectUrl": "https://verify.didit.me/u/...?workflowId=...&redirect_url=..."
}
```

After getting the response, redirect the user to `redirectUrl`.

### React (Web)

```jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function KYCStatus({ userId, token }) {
  const [kycStatus, setKycStatus] = useState(null);
  const [searchParams] = useSearchParams();

  // Handle redirect back from DIDIT verification
  useEffect(() => {
    const status = searchParams.get("kyc_status");
    if (status === "verified") {
      alert("Identity verified successfully!");
      // Clear the query param from URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "failed") {
      alert("Verification failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Fetch current KYC status
  const fetchStatus = async () => {
    const res = await fetch(`${API_URL}/api/kyc/settings/${userId}`, {
      headers: { Authorization: token },
    });
    const data = await res.json();
    setKycStatus(data);
  };

  // Start DIDIT verification — redirects away from your app
  const startVerification = async () => {
    const res = await fetch(`${API_URL}/api/kyc/didit/start/${userId}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    const data = await res.json();

    // Redirect browser to DIDIT verification page
    window.location.href = data.redirectUrl;
  };

  useEffect(() => { fetchStatus(); }, []);

  if (!kycStatus) return <p>Loading...</p>;

  return (
    <div>
      <p>KYC Status: {kycStatus.kyc?.status}</p>
      <p>Verified: {kycStatus.isVerified ? "Yes" : "No"}</p>

      {kycStatus.kyc?.status !== "verified" && (
        <button onClick={startVerification}>Verify Identity</button>
      )}
    </div>
  );
}
```

**Key points for React:**
- Use `window.location.href` to redirect to DIDIT (not React Router navigate, since it's an external URL)
- After DIDIT verification, the user is redirected back to `FRONTEND_URL?kyc_status=verified`
- Read `kyc_status` from the URL query params on your home/landing page
- Call `fetchStatus` again after redirect to get the updated status from backend

### Flutter (Mobile)

For mobile, use a WebView to open the DIDIT verification page, then detect the callback redirect to know when verification is complete.

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:webview_flutter/webview_flutter.dart';

// 1. Fetch KYC status
Future<Map<String, dynamic>> getKycStatus(String userId, String token) async {
  final response = await http.get(
    Uri.parse('$apiUrl/api/kyc/settings/$userId'),
    headers: {'Authorization': token},
  );
  return jsonDecode(response.body);
}

// 2. Start verification and get redirect URL
Future<String> startVerification(String userId, String token) async {
  final response = await http.post(
    Uri.parse('$apiUrl/api/kyc/didit/start/$userId'),
    headers: {'Authorization': token},
  );
  final data = jsonDecode(response.body);
  return data['redirectUrl'];
}

// 3. Open DIDIT in a WebView and detect completion
class KycVerificationScreen extends StatefulWidget {
  final String redirectUrl;
  const KycVerificationScreen({required this.redirectUrl});

  @override
  State<KycVerificationScreen> createState() => _KycVerificationScreenState();
}

class _KycVerificationScreenState extends State<KycVerificationScreen> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            // Detect when DIDIT redirects back to your frontend URL
            if (request.url.contains('kyc_status=')) {
              final uri = Uri.parse(request.url);
              final status = uri.queryParameters['kyc_status'];

              // Close WebView and return result
              Navigator.pop(context, status);
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.redirectUrl));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Identity Verification')),
      body: WebViewWidget(controller: _controller),
    );
  }
}
```

**Usage in Flutter:**
```dart
// Start verification flow
final redirectUrl = await startVerification(userId, token);

// Open WebView and wait for result
final result = await Navigator.push(
  context,
  MaterialPageRoute(
    builder: (_) => KycVerificationScreen(redirectUrl: redirectUrl),
  ),
);

if (result == 'verified') {
  // Refresh user data, show success
} else if (result == 'failed') {
  // Show failure message
}
```

**Key points for Flutter:**
- Use WebView (not `url_launcher`) so you can intercept the redirect back
- Listen for navigation to your `FRONTEND_URL` with `kyc_status` param
- When detected, close the WebView and return the status to the calling screen
- After verification, call `getKycStatus()` again to refresh the user data

### KYC Status Values

| `kyc.status` | `isVerified` | Meaning |
|--------------|-------------|---------|
| `not_started` | `false` | User hasn't attempted verification |
| `pending` | `false` | User started but hasn't completed yet |
| `verified` | `true` | Verification successful |
| `failed` | `false` | Verification failed, user can retry |

