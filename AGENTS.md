# Repository Guidelines

## Project Structure & Module Organization
This repository is a small Vite + React + TypeScript application. Source files live in `src/`: `main.tsx` bootstraps React, `App.tsx` is the top-level UI, and `*.css` files hold component and global styles. Static assets belong in `public/`. Root-level config files such as `vite.config.ts`, `tsconfig*.json`, and `eslint.config.js` define build, TypeScript, and lint behavior. Production output is generated in `dist/` and should not be committed.

## Build, Test, and Development Commands
Install dependencies with `npm install`.

- `npm run dev`: start the Vite dev server with hot reload.
- `npm run build`: run TypeScript project checks, then create a production bundle.
- `npm run lint`: run ESLint across the repository.
- `npm run preview`: serve the built app locally from `dist/`.

Use `npm run build && npm run lint` before opening a PR.

## Coding Style & Naming Conventions
Use TypeScript with ES module imports and React function components. Follow the existing style: 2-space indentation, semicolon-free statements, and small focused components. Name React components in `PascalCase`, hooks in `camelCase` with a `use` prefix, and keep asset/style filenames aligned with their feature when possible, for example `src/App.tsx` and `src/App.css`. Linting is enforced by ESLint (`eslint.config.js`); no Prettier configuration is present, so match the existing code style manually.

## Testing Guidelines
There is no automated test framework configured yet. Until one is added, `npm run build` and `npm run lint` are the minimum validation steps for every change. If you add tests, keep them close to the code they cover with names like `ComponentName.test.tsx` or `feature.test.ts`, and add the corresponding npm script to `package.json`.

## Commit & Pull Request Guidelines
The current Git history uses short, lowercase commit subjects with a prefix and colon, for example `initial: clean scaffolding`. Follow that pattern where practical: `<scope>: <summary>`. Keep commits focused and descriptive.

Pull requests should include a short summary, validation steps you ran, and screenshots or screen recordings for visible UI changes. Link related issues when applicable and call out any follow-up work or known gaps.
