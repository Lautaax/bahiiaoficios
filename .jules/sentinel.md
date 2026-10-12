## 2025-05-18 - Admin API Authentication in Express Server

**Vulnerability:** `/api/admin/toggle-vip` lacked token verification, allowing unauthenticated client requests to execute privileged Firestore operations via Firebase Admin SDK.

**Learning:** Server routes interacting with server-side Admin SDK (`getServerDb()`) bypass Firestore security rules and require explicit Firebase ID token verification via `admin.auth().verifyIdToken(token)` on the server.

**Prevention:** Ensure all `/api/admin/*` routes verify the `Authorization: Bearer <idToken>` header using `verifyAdminAuth` before executing database mutations or administrative operations.
