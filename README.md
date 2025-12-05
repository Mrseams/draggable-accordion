# Draggable Accordion

A minimal Next.js demo that shows a draggable accordion/menu component. It uses React 19, Next 16, Tailwind CSS and several Radix UI primitives.

## Getting Started

Prerequisites

- Node.js (v18+ recommended)
- npm, pnpm or yarn (this repo uses standard npm scripts)

Install dependencies

```powershell
npm install
# or with pnpm
pnpm install
```

Run the development server

```powershell
npm run dev
# or with pnpm
pnpm dev
```

Build for production

```powershell
npm run build
npm run start
```

Project layout

- `app/` — Next.js app routes and pages
- `components/` — React components (e.g. `draggable-menu.tsx`)
- `lib/` — small helpers and utilities
- `public/` — static assets

Notes

- Environment files such as `.env` are ignored by `.gitignore`.
- If you need to run linting use `npm run lint`.
