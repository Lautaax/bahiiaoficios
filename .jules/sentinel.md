## 2025-05-18 - Restrict Firestore User Document Updates with `hasOnly`

**Vulnerability:** In `firestore.rules`, the `usuarios/{userId}` collection rule used `affectedKeys().hasAny(['profesionalInfo', 'isVip', ...])` for updates. Because `hasAny` returns `true` if *at least one* key matches, any unauthenticated or non-owner user could update another user's document, modifying sensitive fields like `isVip` or `profesionalInfo` to gain VIP privileges or overwrite profile details.

**Learning:** `hasAny()` checks for set intersection, so including sensitive fields alongside tracking fields in `hasAny()` opens unauthorized modification vectors on those sensitive fields.

**Prevention:** Always use `hasOnly()` when allowing non-owners to update specific non-sensitive fields (such as FCM tokens or timestamps), ensure `isAuthenticated()` is required, and never include privileged fields like `isVip` or role data in field list rules for non-owners.
