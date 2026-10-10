## 2024-05-24 - Accessibility for Icon-Only Actions
**Learning:** Icon-only buttons used for secondary or destructive actions (like removing images, deleting price references, or clearing filters) are frequently missed when adding accessible labels. This creates major blockers for screen reader users who cannot determine the button's purpose from context alone.
**Action:** Always verify that every interactive element (especially buttons containing only icons like `Trash2`, `X`, or `Star`) has a descriptive `aria-label` or visually hidden text explaining its specific action.
