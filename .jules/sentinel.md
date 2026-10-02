## 2025-05-18 - Unprotected Admin Express Endpoints
**Vulnerability:** Administrative backend API endpoints (`/api/admin/toggle-vip`, `/api/admin/ai-optimize`, `/api/admin/daily-churn-audit`, `/api/admin/category-promotion-insights`) were exposed without authentication or role verification, allowing any client to invoke elevated operations.
**Learning:** Server endpoints were created under `/api/admin/` assuming client-side UI routing and authorization was sufficient protection.
**Prevention:** Always enforce backend authentication and role verification middleware (e.g. `requireAdmin` verifying Firebase ID tokens) on all administrative routes regardless of client-side guards.
