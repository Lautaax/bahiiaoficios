## 2025-05-18 - Missing Authentication and Authorization on Administrative API Endpoints

**Vulnerability:**
The `/api/admin/toggle-vip` backend endpoint allowed unauthenticated HTTP POST requests to modify user VIP status in Firestore without validating Firebase Auth tokens or admin permissions.

**Learning:**
Server endpoints interacting with Firebase Admin SDK bypass Firestore security rules entirely. Relying solely on client UI checks or client-side auth state without validating `Authorization: Bearer <idToken>` on server routes exposes administrative actions to unauthorized callers.

**Prevention:**
Always verify Firebase ID tokens using `admin.auth().verifyIdToken(token)` and check for admin role claims or DB privileges on all sensitive server endpoints before executing privileged mutations.
