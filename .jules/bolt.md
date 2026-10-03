## 2025-03-05 - Missing dependency `workbox-window`
**Learning:** `pnpm build` (`vite build`) fails if `workbox-window` is missing from `package.json` while using `vite-plugin-pwa`. This must be added to successfully compile. Also, motion was replacing framer-motion.
**Action:** Always check the memory instructions and verify build if using PWA or when framer-motion is used.
