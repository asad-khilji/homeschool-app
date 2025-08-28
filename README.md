# Homeschool App (Vanilla HTML/CSS/JS + JSON)
A tiny role-based SPA that matches the screenshots: landing → login/register → Student/Parent/Teacher panels with Dashboard, Assignments, and Grades.

## Demo Accounts
- **Student:** `john` / `pass123`
- **Parent:** `mike` / `pass123`
- **Teacher:** `joe` / `pass123`

## Run locally
For `fetch('data.json')` to work, serve files over HTTP. Easiest methods:
- VS Code Live Server, or
- Python: `python3 -m http.server` (then visit http://localhost:8000)

> If you open `index.html` directly (file://), the app still loads but without the JSON seed; however, the demo accounts are automatically pre-seeded into localStorage on first load.

## Files
- `index.html` – markup & view containers
- `styles.css` – gradient UI, cards, sidebar
- `app.js` – SPA logic, auth, and role views
- `data.json` – demo content (users, students, courses, assignments, grades)

## Customize
- Change seed data in `data.json`.
- Look for `render*` functions in `app.js` to tweak UI per role.
- Replace gradients and spacing tokens in `styles.css` to match your brand.
