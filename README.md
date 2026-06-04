# scrobbling-away

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Self, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - UI primitives live in `src/components/ui`
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Husky** - Git hooks for code quality
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)

## Getting Started

First, install the dependencies:

```bash
bun install
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

## UI Customization

shadcn/ui primitives live directly in this app.

- Change design tokens and global styles in `src/styles/globals.css`
- Update primitives in `src/components/ui/*`
- Adjust shadcn aliases or style config in `components.json`

### Add More Components

Run this from the project root to add more primitives:

```bash
npx shadcn@latest add accordion dialog popover sheet table
```

Import components like this:

```tsx
import { Button } from "@/components/ui/button";
```

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Format and lint fix: `bun run check`

## Project Structure

```
scrobbling-away/
├── src/             # Fullstack application (React + TanStack Start)
│   ├── api/         # API layer / business logic
│   ├── components/  # App and UI components
│   ├── env/         # Environment validation
│   └── routes/      # TanStack Router routes
├── public/          # Static assets
```

## Available Scripts

- `bun run dev`: Start the app in development mode
- `bun run build`: Build the app
- `bun run serve`: Preview the production build
- `bun run check-types`: Check TypeScript types
- `bun run check`: Run Oxlint and Oxfmt
