## 2025-05-18 - Overly Permissive Firestore Update Rules on User Profiles and Stats

**Vulnerability:** Any authenticated or unauthenticated user could modify sensitive profile attributes (e.g. `isVip`, `profesionalInfo`) on arbitrary user documents in Firestore, as well as write unauthenticated to `/usuarios/{userId}/stats/{statId}` subcollections.

**Learning:** `affectedKeys().hasAny([...])` was used in `firestore.rules` without enforcing `isOwner(userId)` or `isAdmin()`, allowing any request affecting those keys to bypass authorization checks.

**Prevention:** Always wrap field-specific diff rules with authentication/ownership checks (`isOwner(userId) || isAdmin()`), ensuring unauthenticated or non-owner users cannot update user document fields or subcollections.
