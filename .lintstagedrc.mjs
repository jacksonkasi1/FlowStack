// Runs on staged files only. lint-staged stashes unstaged changes first, so
// partially staged files are checked and formatted without touching the rest.
export default {
  "*.{ts,tsx,mjs,js}": [
    "eslint --config eslint.config.mjs --max-warnings=0 --no-warn-ignored",
    "prettier --write",
  ],
  "*.{json,md,yml,yaml,css}": "prettier --write",
};
