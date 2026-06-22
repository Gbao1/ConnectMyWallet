# ConnectMyTask — Web Application Test Cases

**Document version:** 1.0  
**Application:** Web-connectmytask (React)  
**API:** ConnectMyTask backend (`http://localhost:4000`) — same API as mobile  
**API:** ConnectMyTask backend only (`:4000`) — contact + fraud events are on the main API  

**Tester instructions:** Fill **Actual Result** and **Status** (`Pass` / `Fail` / `Blocked` / `Not Run`) during execution. Leave **Expected Result** unchanged unless product owner updates requirements.

---

## Test environment prerequisites

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| ENV-01 | MongoDB available | 1. Start MongoDB on `127.0.0.1:27017`<br>2. Confirm Compass connects to `connectMyTask` | Database accepts connections | | Not Run |
| ENV-02 | Backend API running | 1. `cd ConnectMyTask/server` → `npm start`<br>2. Open `http://localhost:4000/api-docs/` | Server on port 4000; Swagger loads | | Not Run |
| ENV-03 | Web app running | 1. `cd web` → `npm start`<br>2. Open `http://localhost:3000` | React app loads home page | | Not Run |
| ENV-04 | Docker frontend (optional) | 1. Backend on :4000<br>2. `cd web` → `docker compose up --build`<br>3. Open `http://localhost:8080` | Production build serves SPA; API calls reach :4000 | | Not Run |

---

## Module 1 — Authentication & account (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| AUTH-01 | Register new customer (email) | 1. Go to `/auth?mode=register`<br>2. Choose role **User**<br>3. Submit valid name, email, password<br>4. Complete reCAPTCHA if enabled | Success message; verification email sent (SendGrid); **no** JWT until email verified | | Not Run |
| AUTH-02 | Login before email verified | 1. Register new user (AUTH-01)<br>2. Attempt login without verifying email | **403** / message `EMAIL_NOT_VERIFIED`; user not logged in | | Not Run |
| AUTH-03 | Verify email via link | 1. Open link from verification email<br>2. Or use `/verify-email?token=...` | Email marked verified; user can log in | | Not Run |
| AUTH-04 | Login customer after verification | 1. `/auth?mode=login`<br>2. Enter verified credentials | Redirect to `/dashboard`; header shows user name | | Not Run |
| AUTH-05 | Register new provider | 1. `/auth?mode=register`<br>2. Choose role **Provider**<br>3. Submit valid details | Account created; verification email sent | | Not Run |
| AUTH-06 | Login provider | 1. Verify provider email<br>2. Login | Redirect to `/provider-dashboard` | | Not Run |
| AUTH-07 | Invalid login credentials | 1. Login with wrong password | Error shown; no session token stored | | Not Run |
| AUTH-08 | Forgot password — request reset | 1. `/forgot-password`<br>2. Submit registered email | Success message; reset email sent | | Not Run |
| AUTH-09 | Forgot password — set new password | 1. Open reset link with token<br>2. Submit new password meeting rules | Password updated; can login with new password | | Not Run |
| AUTH-10 | Google sign-in (if configured) | 1. Click Google on auth page<br>2. Complete OAuth<br>3. Select role on first sign-up | User created/logged in; correct dashboard by role | | Not Run |
| AUTH-11 | Facebook sign-in (if configured) | Same as AUTH-10 for Facebook | User created/logged in | | Not Run |
| AUTH-12 | Guest cannot access private routes | 1. Log out<br>2. Visit `/dashboard` | Redirect to `/auth?mode=login` | | Not Run |
| AUTH-13 | Provider cannot access user-only post task | 1. Login as provider<br>2. Navigate to `/tasks/new` manually | Redirect or forbidden per app rules | | Not Run |
| AUTH-14 | Session persists on refresh | 1. Login<br>2. Refresh browser | Still logged in; same dashboard | | Not Run |
| AUTH-15 | Logout | 1. Use header logout | Token cleared; redirected to public page | | Not Run |

**Backend reference:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/verify-email`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

---

## Module 2 — Public & marketing pages (Web UI only)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| PUB-01 | Home page | 1. Open `/` | Hero, navigation, footer render; links work | | Not Run |
| PUB-02 | How it works | 1. Open `/how-it-works` | Content loads; no auth required | | Not Run |
| PUB-03 | Pricing | 1. Open `/pricing` | Pricing content loads | | Not Run |
| PUB-04 | About / Trust & Safety / Legal | 1. Open `/about`, `/trust-safety`, `/privacy-policy`, `/terms-of-service`, `/cookies` | Each page loads without errors | | Not Run |
| PUB-05 | Contact form | 1. Open `/contact`<br>2. Submit valid form | Success feedback; email/notification sent via main API (`POST /api/contact`) | | Not Run |
| PUB-06 | Careers page | 1. Open `/careers` | Page loads | | Not Run |
| PUB-07 | Language switcher | 1. On any public page switch EN / LO / TH | UI strings change language | | Not Run |

---

## Module 3 — Customer: post a task (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| TASK-01 | Open post task wizard | 1. Login as **user**<br>2. Go to `/tasks/new` | Multi-step form displays | | Not Run |
| TASK-02 | Create task — happy path | 1. Complete all steps (title, category, description, budget, location, dates, images if any)<br>2. Submit | **201**; task in MongoDB `tasks`; appears on `/dashboard` as **Active** | | Not Run |
| TASK-03 | Validation — missing required fields | 1. Try submit with empty title or budget | Inline errors; task not created | | Not Run |
| TASK-04 | Upload task images | 1. Attach 1–5 images on post form<br>2. Submit | Images stored; visible on task detail | | Not Run |
| TASK-05 | reCAPTCHA on create (if enabled) | 1. Submit without valid token | Request rejected with clear error | | Not Run |

**Backend reference:** `POST /api/tasks` (multipart), reCAPTCHA middleware

---

## Module 4 — Customer: dashboard & bid management (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| CUST-01 | Dashboard loads my tasks | 1. Login as user with tasks<br>2. Open `/dashboard` | Only tasks owned by user listed; stats correct | | Not Run |
| CUST-02 | View bids on a task | 1. Expand task with bids | Bid list shows provider name, amount, message | | Not Run |
| CUST-03 | Accept bid | 1. Click accept on a bid<br>2. Complete payment redirect if prompted | Task **In Progress**; assigned provider set; payment flow starts | | Not Run |
| CUST-04 | Cannot accept bid when not owner | 1. As another user call accept API (Swagger) | **403** Forbidden | | Not Run |
| CUST-05 | Task comments | 1. Open comments on a task<br>2. Post comment | Comment saved and displayed | | Not Run |
| CUST-06 | Search / filter tasks | 1. Use search and status filter on dashboard | List filters correctly | | Not Run |
| CUST-07 | Delete task (if allowed) | 1. Delete task with no bids or per rules | Task removed from list and DB | | Not Run |

**Backend reference:** `GET /api/tasks`, `PUT /api/tasks/:id/acceptBid/:bidId`, comments routes

---

## Module 5 — Payments (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| PAY-01 | Initiate payment after accept bid | 1. Accept bid (CUST-03)<br>2. Follow redirect to payment page | Payment session created; redirect to SSLCommerz (or sandbox) | | Not Run |
| PAY-02 | Payment success return | 1. Complete sandbox payment<br>2. Land on `/payment/success` or return URL | Transaction `success` in DB; task proceeds | | Not Run |
| PAY-03 | Payment failed return | 1. Trigger failed payment<br>2. Land on `/payment/fail` | User sees failure message; task not paid | | Not Run |
| PAY-04 | Payment cancelled | 1. Cancel at gateway<br>2. Land on `/payment/cancel` | Cancel message; can retry | | Not Run |
| PAY-05 | Escrow payout created (backend) | 1. After successful payment check `payouts` collection | Payout in **escrow** linked to task | | Not Run |

**Backend reference:** Payment controller / SSLCommerz webhook, `payoutService.createEscrowPayout`

---

## Module 6 — Customer: complete task & review (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| REV-01 | Complete task modal | 1. Task **In Progress** with work done<br>2. Click **Complete Task** | Modal with star ratings and comment | | Not Run |
| REV-02 | Submit review — happy path | 1. Rate all dimensions 1–5<br>2. Optional comment<br>3. Submit | **200**; task **Completed**; `reviews` doc with `taskId`/`reviewerId`; provider stats updated | | Not Run |
| REV-03 | Duplicate review blocked | 1. Submit review twice for same task | Second attempt **409** or “already completed” | | Not Run |
| REV-04 | Payout scheduled after complete | 1. After REV-02 check `payouts` | Status moves escrow → scheduled → available (dev: instant) | | Not Run |
| REV-05 | Sub-rating validation | 1. Submit invalid sub-ratings via API | **400** validation error | | Not Run |

**Backend reference:** `PUT /api/tasks/:id/completeTask`, `schedulePayoutForTask`

---

## Module 7 — Provider: browse tasks & bidding (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| PROV-01 | Find tasks page | 1. Login as provider<br>2. Open `/find-tasks` | Available tasks listed | | Not Run |
| PROV-02 | KYC banner when not verified | 1. Provider without KYC<br>2. Open `/provider-dashboard` | Amber banner: complete KYC before bidding | | Not Run |
| PROV-03 | Bid blocked in UI without KYC | 1. Click **Submit bid** without KYC | Confirm dialog; option to go to profile | | Not Run |
| PROV-04 | Bid blocked by API without KYC | 1. Call `POST /api/tasks/:id/bid` without verified KYC | **403** `KYC_REQUIRED` | | Not Run |
| PROV-05 | Submit bid — KYC verified | 1. Complete KYC (Module 8)<br>2. Submit bid on Active task | **200**; bid on task; client notified | | Not Run |
| PROV-06 | Bid modal validation | 1. Open bid modal<br>2. Submit empty amount or message | Errors shown; no API call | | Not Run |
| PROV-07 | Cannot bid twice same task | 1. Bid on task<br>2. Try bid again | UI shows “Bid submitted”; API rejects duplicate if applicable | | Not Run |
| PROV-08 | My Bids tab | 1. After bidding open **My Bids** tab | Task appears under bids | | Not Run |

**Backend reference:** `POST /api/tasks/:id/bid` (KYC check on `dev`)

---

## Module 8 — KYC / identity verification (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| KYC-01 | View KYC status on provider profile | 1. `/provider/profile` | Status: not_started / pending / verified / failed | | Not Run |
| KYC-02 | Start Didit verification | 1. Click start verification<br>2. Complete Didit flow (sandbox) | `user.kyc.status` → pending then verified; workflow URL stored | | Not Run |
| KYC-03 | KYC complete redirect | 1. Finish Didit<br>2. Land on `/kyc-complete` | Success/error message; status refresh works | | Not Run |
| KYC-04 | Refresh KYC status | 1. Click refresh on profile | UI matches backend `GET /api/kyc/settings/:userId` | | Not Run |
| KYC-05 | Verified provider can bid | 1. After KYC verified submit bid | Bid succeeds (PROV-05) | | Not Run |
| KYC-06 | User profile KYC (if customer) | 1. `/profile` KYC section | Same flows for user role if enabled | | Not Run |

**Backend reference:** `GET /api/kyc/settings/:userId`, `POST /api/kyc/didit/start/:userId`, Didit callback

---

## Module 9 — Provider: jobs & mark complete (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| JOB-01 | My Jobs tab after bid accepted | 1. Client accepts provider bid<br>2. Provider opens **My Jobs** | Task shows **In Progress** | | Not Run |
| JOB-02 | Mark complete — submit evidence | 1. Click mark complete<br>2. Add comment and up to 5 images<br>3. Submit | `PATCH /api/tasks/:id/providerComplete` **200**; `completionSubmission` saved | | Not Run |
| JOB-03 | Completion pending state | 1. After JOB-02 | UI shows pending approval; button disabled | | Not Run |
| JOB-04 | Email client link (if shown) | 1. On in-progress job use email requester | `mailto:` opens with client email | | Not Run |
| JOB-05 | Payout status on job card | 1. View job with payout created | Payout status label shown (escrow/scheduled/available/etc.) | | Not Run |

**Backend reference:** `PATCH /api/tasks/:id/providerComplete` (multipart)

---

## Module 10 — Provider wallet & withdrawals (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| WAL-01 | Wallet page loads | 1. `/provider/wallet` | Available, pending, total balances shown | | Not Run |
| WAL-02 | Payout history table | 1. View history section | Rows with status, gross, commission, net | | Not Run |
| WAL-03 | Save bKash destination | 1. Add mobile banking destination<br>2. Save | **201**; `users.payoutDestinations` updated | | Not Run |
| WAL-04 | Withdraw single payout | 1. Payout **available**<br>2. Select destination<br>3. Withdraw | Status **pending_approval**; available balance decreases | | Not Run |
| WAL-05 | Withdraw all available | 1. Click withdraw all | All available payouts → pending_approval | | Not Run |
| WAL-06 | Wallet sync after release | 1. Complete customer review (releases funds in dev)<br>2. Refresh wallet | Balances match sum of available payouts | | Not Run |
| WAL-07 | Cannot withdraw without destination | 1. No destination saved<br>2. Try withdraw | Button disabled or clear error | | Not Run |

**Backend reference:** `GET /api/payouts/wallet`, `GET /api/payouts/history`, `POST /api/payouts/destinations`, `POST /api/payouts/:id/withdraw`, `POST /api/payouts/withdraw-all`, `syncProviderWallet`

---

## Module 11 — Admin: payout approvals (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| ADM-P01 | Access pending approvals | 1. Login as admin<br>2. `/admin/fraud` → **Pending Approvals** | List of `pending_approval` payouts | | Not Run |
| ADM-P02 | Approve payout (dev mock) | 1. Click **Approve** | Payout **paid** (mock disburse in dev); removed from pending list | | Not Run |
| ADM-P03 | Reject payout | 1. Enter optional reason<br>2. Click **Reject** | Payout **rejected**; funds return to provider wallet | | Not Run |
| ADM-P04 | Reject without false “Failed to fetch” | 1. Reject payout<br>2. Observe bottom of page | No misleading network error; backend on :4000 reachable | | Not Run |
| ADM-P05 | View task context on approval card | 1. Open pending item | Task title, provider, net amount, completion context shown | | Not Run |

**Backend reference:** `GET /api/payouts/admin/pending`, `POST /api/payouts/admin/:payoutId/approve`, `POST /api/payouts/admin/:payoutId/reject`

---

## Module 12 — Admin panel (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| ADM-01 | Admin panel access | 1. Login as admin<br>2. `/admin` | Users / Providers / Tasks / Fraud tabs load | | Not Run |
| ADM-02 | List users | 1. Users tab | User list from backend admin API | | Not Run |
| ADM-03 | Verify user | 1. Click verify on unverified user | User marked verified in UI and DB | | Not Run |
| ADM-04 | Delete user | 1. Delete test user with confirm | User removed from list | | Not Run |
| ADM-05 | List providers & tasks | 1. Switch tabs | Data loads without error | | Not Run |
| ADM-06 | Flagged accounts | 1. Fraud tab in admin panel | Flagged users/device data shown | | Not Run |
| ADM-07 | Non-admin blocked | 1. Login as user<br>2. Visit `/admin` | Redirect to dashboard | | Not Run |

**Backend reference:** `/api/admin/*` routes (users, providers, tasks, fraud/flagged-accounts)

---

## Module 13 — Admin: fraud & review moderation (Web UI + Backend / Legacy API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| FRAUD-01 | Fraud events tab | 1. Login as admin<br>2. `/admin/fraud` → Fraud Events | Events list and stats load from `GET /api/admin/fraud` | | Not Run |
| FRAUD-02 | Update fraud event status | 1. Select an event<br>2. Change status to reviewed | `PATCH /api/admin/fraud/:id` succeeds; list updates | | Not Run |
| FRAUD-03 | Review moderation queue | 1. **Review Moderation** tab | Flagged/pending reviews listed | | Not Run |
| FRAUD-04 | Approve review | 1. Approve a review in queue | Status updated; removed or marked approved | | Not Run |
| FRAUD-05 | Reject review | 1. Reject review | Status rejected or removed per API | | Not Run |

**API note:** Fraud events, contact form, and payout approvals all use the **main backend** (`:4000`).

---

## Module 14 — Messaging (Web UI + Backend API + Socket.IO)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| MSG-01 | Open messages | 1. Login<br>2. `/messages` | Conversation list loads | | Not Run |
| MSG-02 | Send text message | 1. Open thread<br>2. Send message | Message saved; appears in thread | | Not Run |
| MSG-03 | Real-time receive | 1. Two browsers: user A and B<br>2. A sends message | B sees message without full page reload | | Not Run |
| MSG-04 | Send image (if supported) | 1. Attach image in chat | Image delivered and displayed | | Not Run |
| MSG-05 | Deep link to user | 1. `/messages/:userId` | Opens correct conversation | | Not Run |

**Backend reference:** Messages REST + Socket.IO on backend server

---

## Module 15 — Profiles & public views (Web UI + Backend API)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| PROF-01 | User profile edit | 1. `/profile`<br>2. Update name, photo, location | **200**; changes persist on refresh | | Not Run |
| PROF-02 | Provider profile edit | 1. `/provider/profile`<br>2. Update skills, bio | Changes saved | | Not Run |
| PROF-03 | View provider public page | 1. `/providers/:id` | Ratings, reviews, trust badge display | | Not Run |
| PROF-04 | View user public page | 1. `/users/:id` | Public user info shown | | Not Run |
| PROF-05 | Resend verification email | 1. Unverified user on profile<br>2. Resend | Email sent; no error | | Not Run |

**Backend reference:** `PUT /api/auth/profile`, reviews `GET` for provider

---

## Module 16 — End-to-end business flows (Web + Backend)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| E2E-01 | Full happy path | 1. User posts task<br>2. Provider (KYC verified) bids<br>3. User accepts & pays<br>4. Provider completes job<br>5. User reviews<br>6. Provider withdraws<br>7. Admin approves payout | All statuses correct in UI and MongoDB (`tasks`, `transactions`, `payouts`, `reviews`) | | Not Run |
| E2E-02 | Reject withdrawal path | 1. Provider withdraws<br>2. Admin rejects | `payouts.status` = rejected; provider wallet balance restored; `transactions` still success | | Not Run |
| E2E-03 | Same DB as mobile | 1. Create task on web<br>2. Confirm same record visible if mobile uses same MongoDB URI | Single database; no duplicate account split | | Not Run |

---

## Module 17 — Docker / production build (Web hosting only)

| ID | Description | Test steps | Expected result | Actual result | Status |
|----|-------------|------------|-----------------|---------------|--------|
| DOC-01 | Docker compose build | 1. `docker compose up --build` | Image builds; app on :8080 | | Not Run |
| DOC-02 | SPA routing in nginx | 1. Open deep link e.g. `/dashboard` on :8080 | Page loads (no 404 from nginx) | | Not Run |
| DOC-03 | API URL baked in build | 1. Build with `REACT_APP_API_BASE_URL`<br>2. Login on :8080 | Calls hit configured API host | | Not Run |

---

## Appendix A — Backend-only checks (Swagger / Postman)

Use when validating API without UI. Same backend mobile uses.

| ID | Endpoint | Expected |
|----|----------|----------|
| API-01 | `POST /api/auth/register` | 201; verification required |
| API-02 | `POST /api/tasks/:id/bid` without KYC | 403 `KYC_REQUIRED` |
| API-03 | `PUT /api/tasks/:id/completeTask` | 200; review + payout schedule |
| API-04 | `GET /api/payouts/wallet` | Balances match payouts collection |
| API-05 | `POST /api/payouts/admin/:id/reject` | 200; status rejected |

---

## Appendix B — Test assignment matrix (suggested)

| Module | Suggested owner | # cases |
|--------|-----------------|--------|
| ENV | DevOps / QA lead | 4 |
| AUTH | | 15 |
| PUB | | 7 |
| TASK / CUST | | 12 |
| PAY / REV | | 13 |
| PROV / KYC / JOB | | 19 |
| WAL / ADM-P | | 12 |
| ADM / FRAUD | | 12 |
| MSG / PROF | | 10 |
| E2E | QA lead | 3 |
| DOC | DevOps | 3 |

**Total web test cases:** 113 (+ 5 API appendix)
