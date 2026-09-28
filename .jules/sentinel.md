## 2025-05-10 - Unprotected Express Admin Endpoints in Hybrid Firebase App
**Vulnerability:** Unauthenticated REST API endpoints under `/api/admin/*` (`toggle-vip`, `ai-optimize`, `daily-churn-audit`, `category-promotion-insights`) bypassed client-side Firestore rules and allowed unauthorized modification of user roles and trigger of costly LLM services.
**Learning:** Even if Firestore security rules are strict, custom Express endpoints running with `firebase-admin` privilege bypass client rules completely unless explicit authentication middleware verifies the Bearer ID token with `admin.auth().verifyIdToken()`.
**Prevention:** Always attach a `verifyAdmin` or `verifyAuth` Express middleware on server routes that perform privilege-sensitive operations or invoke paid external APIs.
