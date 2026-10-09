# Sentinel Security Journal

## 2025-05-18 - Unauthenticated VIP Status Modification Endpoint
**Vulnerability:** The `/api/admin/toggle-vip` Express route allowed any client to activate or revoke VIP status for arbitrary user accounts without providing authentication or admin authorization headers.
**Learning:** Server routes interacting with Firebase Admin SDK directly bypass Firestore security rules. Server routes must independently verify Firebase ID tokens using `admin.auth().verifyIdToken(idToken)` and check user roles before executing administrative mutations.
**Prevention:** Always implement an explicit authentication and authorization check middleware or header inspection on Express backend endpoints performing write/update operations on Firestore data.
