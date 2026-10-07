## 2024-05-18 - Missing ARIA Labels in Chatbot
**Learning:** Found multiple icon-only buttons without aria-labels in HelpChatbot.tsx (Close, Send, Toggle). This makes them completely invisible/unusable to screen reader users. Added descriptive aria-labels. I'll need to keep an eye out for more of these patterns across the app.
**Action:** Always check icon-only buttons for aria-labels when working with new components.
