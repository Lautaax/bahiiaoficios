## 2024-05-24 - Interactive floating components require explicit a11y focus
**Learning:** Floating widgets (like chat buttons or floating action buttons) often rely purely on icons and absolute positioning, which causes screen readers to announce them as unlabeled buttons and keyboard users to lose focus context.
**Action:** Always add `aria-expanded` when the widget toggles a panel, ensure `aria-label` correctly describes both states (e.g. "Open" vs "Close"), and verify that `focus-visible` outline rings contrast against the background since floating buttons often use primary brand colors.
