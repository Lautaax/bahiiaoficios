## 2024-05-18 - Hoisting Invariant Logic & Framer Motion V12

**Learning:** Redundant calculations and I/O logic in a `useMemo` filter block (like reading LocalStorage and evaluating `JSON.parse` iteratively inside `.filter()`) can block the main thread unnecessarily. This affects UI performance significantly when typing to search and causes high time complexity. Additionally, Framer Motion v12 now requires importing from `motion/react` rather than `framer-motion`.

**Action:** Always extract static and invariant logic (including blocking `LocalStorage` and static mapping) out of heavy loop closures like `.filter()`. Ensure any animations strictly use `motion/react` to prevent type-checking build errors in the frontend.
