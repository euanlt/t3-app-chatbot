# Development Workflow

## Error Prevention System

This project implements a multi-layer error prevention system to catch ESLint errors, TypeScript issues, and formatting problems before they reach Vercel deployment.

### 1. Pre-commit Hooks (Local)

Pre-commit hooks run automatically before each commit:

```bash
# Manual test
.husky/pre-commit
```

**Checks:**
- TypeScript type checking (`npm run typecheck`)
- Prettier formatting (`npm run format:check`)

**Note:** ESLint is excluded from pre-commit hooks due to performance issues in WSL environment.

### 2. GitHub Actions CI (Remote)

Full CI pipeline runs on every push and pull request:

```bash
# Manual test (mimics CI)
npm run ci
```

**Checks:**
- ESLint with zero warnings (`npm run lint -- --max-warnings 0`)
- TypeScript type checking (`npm run typecheck`)
- Build process (`npm run build`)

### 3. NPM Scripts

Available scripts for manual checking:

```bash
# Quick checks (matches pre-commit)
npm run check

# Fix formatting and linting issues
npm run check:fix

# Full CI pipeline (matches GitHub Actions)
npm run ci

# Individual checks
npm run lint
npm run typecheck
npm run format:check
npm run format:write
```

### 4. Development Tips

1. **Before committing**: Pre-commit hooks will run automatically
2. **Before pushing**: Run `npm run ci` to ensure CI will pass
3. **Fix formatting**: Run `npm run format:write` to auto-fix Prettier issues
4. **Fix linting**: Run `npm run lint:fix` to auto-fix ESLint issues

### 5. Files and Configuration

- `.husky/pre-commit`: Pre-commit hook script
- `.github/workflows/ci.yml`: GitHub Actions CI configuration
- `package.json`: NPM scripts for all quality checks
- `eslint.config.js`: ESLint configuration
- `prettier.config.js`: Prettier configuration

This multi-layer approach ensures that:
1. Basic issues are caught locally before commit
2. All issues are caught in CI before deployment
3. Vercel builds will succeed without ESLint errors