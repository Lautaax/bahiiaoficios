
## 2024-03-22 - Missing ARIA Labels and Focus Rings on Filter Tags
**Learning:** Found a recurring pattern in `src/components/TrabajosSolicitados.tsx` where dynamic active-filter tags used icon-only clear buttons (an `X` icon). These buttons were completely inaccessible (lacked `aria-label`) and lacked keyboard focus indicators (`focus-visible`), making them un-tabbable and unusable by screen readers.
**Action:** Always verify that interactive icon elements within dynamic lists or tags have an explicit `aria-label` and `focus-visible` ring.
