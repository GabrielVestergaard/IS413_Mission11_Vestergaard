Frontend (React + TypeScript)

This folder contains the frontend. Prettier is configured here.

To install Prettier and run a check (zsh):

```bash
cd frontend
npm install --no-audit --no-fund --save-dev prettier@^3.0.0
npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"
# or to format in place:
# npm run format
```
