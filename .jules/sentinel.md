## 2025-05-18 - GitHub Upload Path Traversal Vulnerability
**Vulnerability:** The `/api/upload-github` endpoint accepted unsanitized user input for the `filename` parameter and concatenated it directly into the GitHub API contents URL, allowing path traversal (e.g. `../../.github/workflows/...`).
**Learning:** Using raw filenames provided by client requests when constructing remote API file paths or filesystem paths exposes the application to path traversal attacks (CWE-22).
**Prevention:** Always sanitize input filenames using a strict basename extractor and allowlist regex (e.g. `sanitizeFilename`) before constructing resource paths or external API URLs.
