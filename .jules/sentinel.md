## 2025-05-18 - Missing Administrative Authorization on `/api/admin/toggle-vip`
**Vulnerability:** The `/api/admin/toggle-vip` API endpoint accepted POST payloads modifying `isVip` user document fields without inspecting authentication headers or verifying admin credentials.
**Learning:** Endpoints under `/api/admin/` require server-side token validation even when primary mutations are triggered client-side via Firebase SDKs.
**Prevention:** Implement `verifyAdminAuthorization` helper utilizing `admin.auth().verifyIdToken(idToken)` and check admin roles/claims on all administrative endpoints, failing closed when unauthenticated.
