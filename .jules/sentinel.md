## 2025-05-18 - Unsafe `hasAny` Evaluation in Firestore Document Update Rules

**Vulnerability:** Firestore security rules used `request.resource.data.diff(resource.data).affectedKeys().hasAny(['profesionalInfo', 'isVip', ...])` without checking document ownership or admin status. Because `hasAny()` returns true if *any* affected key matches, any unauthenticated or authenticated user could update any user profile document in `/usuarios/{userId}` and self-assign `isVip: true`.

**Learning:** Developers intended to allow safe partial profile updates, but `hasAny` allows any caller to modify arbitrary fields as long as one matching key is in the update diff.

**Prevention:** Always pair `affectedKeys()` checks with strict authorization conditions (`isOwner(userId)` or `isAdmin()`) and use negative checks (`!affectedKeys().hasAny(['isVip', 'isAdmin'])`) to prohibit non-admin users from updating privilege/billing status fields.
