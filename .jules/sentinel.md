## 2026-03-22 - Fail-closed Authorization on Express Admin Endpoints
**Vulnerability:** Unauthenticated access to administrative endpoint `/api/admin/toggle-vip` allowed arbitrary users to mutate VIP status in Firestore.
**Learning:** API endpoints handling sensitive operations must require `Bearer` token verification and check admin claims or roles, ensuring security checks fail closed if credentials or authentication services are missing.
**Prevention:** Always enforce strict fail-closed authentication middleware on all sensitive `/api/admin/*` endpoints before executing database mutations.
