## 2026-03-29 - Missing Admin Auth Check on Server VIP Endpoint

**Vulnerability:** The server API endpoint `/api/admin/toggle-vip` allowed updating VIP membership status for any user directly in Firestore using server-side Firebase Admin credentials without verifying if the requesting user was authenticated or possessed admin rights.

**Learning:** When express server routes interact with database collections via privileged admin SDKs (such as `firebase-admin`), client routes or direct POST requests bypass client-side security rules if authorization tokens are not explicitly verified on the backend.

**Prevention:** Always verify Firebase ID tokens using `admin.auth().verifyIdToken(token)` and check admin roles/claims on all express server endpoints before executing administrative database mutations.
