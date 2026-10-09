## 2024-05-18 - HelpChatbot ARIA Labels
**Learning:** Found multiple icon-only buttons (close window, send message, open/close toggle) in `HelpChatbot.tsx` lacking `aria-label` attributes.
**Action:** Added context-appropriate Spanish `aria-label`s to improve accessibility for screen readers. Kept the toggle label dynamic (`isOpen ? "Cerrar asistente virtual" : "Abrir asistente virtual"`) as its visual icon changes based on state.
