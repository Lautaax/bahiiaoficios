## 2023-10-24 - Redundant filtering calculations

**Learning:** `useMemo` dependency arrays only prevent recalculation across renders. Inside loops like `Array.filter` within a `useMemo`, we still need to manually extract invariant logic (like filtering nested arrays, normalizing string variables, or computing flags) to prevent O(N * M) performance degradation.

**Action:** Always identify and hoist loop-invariant computations outside of array methods like `filter`, `map`, and `reduce`, even when they are inside a `useMemo` block.
