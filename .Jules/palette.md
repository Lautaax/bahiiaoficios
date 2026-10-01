## 2026-10-01 - Accessible Header Dropdown Toggles

**Learning:** Header icon-only buttons (such as notification bell toggles) require dynamic `aria-label`s announcing badge counts (e.g., `Notificaciones (3 sin leer)`), explicit `aria-expanded` state, `aria-haspopup="true"`, visible keyboard focus indicators (`focus-visible:ring-2`), and an `Escape` key event listener to properly support screen readers and keyboard navigation.

**Action:** Whenever building or modifying header popovers or dropdown triggers, always include dynamic screen reader labels, keyboard focus rings, and an `Escape` listener for keyboard accessibility.
