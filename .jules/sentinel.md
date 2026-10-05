## 2025-05-18 - Prevent Privilege Escalation in Firestore Security Rules

**Vulnerability:** Firestore security rules previously used `.affectedKeys().hasAny([...])` for tracking updates, allowing arbitrary profile fields (including `isAdmin`, `isVip`, and `rol`) to be modified in the same update request as long as one allowed tracking field was included. Furthermore, non-admin users could set `isAdmin` or `rol: 'admin'` on document creation or updates.

**Learning:** `hasAny` in Firestore Security Rules checks if *at least one* key in the list is present, not that *only* those keys are present. For restricting update field scopes, `.affectedKeys().hasOnly([...])` must be used. Also, explicit checks prohibiting non-admins from modifying `isAdmin` or `rol` are necessary for user document updates and creations.

**Prevention:** Always use `hasOnly([...])` when allowing partial document updates for specific allowed fields. Explicitly restrict privilege fields (`isAdmin`, `rol`) on `create` and `update` rules.
