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

# Vercel-specific commands
npm run vercel:build      # Build with Vercel CLI
npm run vercel:check      # Pull env vars and build with Vercel
npm run vercel:validate   # Comprehensive Vercel validation script
npm run ci:vercel         # CI pipeline with Vercel build

# Individual checks
npm run lint
npm run typecheck
npm run format:check
npm run format:write
```

### 4. Vercel Integration

The project includes comprehensive Vercel CLI integration for local testing:

#### Quick Vercel Commands:
```bash
# Test exact Vercel deployment process
npm run vercel:validate

# Build with Vercel CLI (matches deployment)
npm run vercel:build

# Pull environment variables and build
npm run vercel:check
```

#### Vercel CLI Setup:
1. **Install Vercel CLI**: `npm install -g vercel@latest`
2. **Login to Vercel**: `vercel login`
3. **Link Project**: `vercel link` (if not already linked)

#### What `vercel:validate` Does:
- Pulls latest environment variables from Vercel
- Runs ESLint with zero warnings
- Runs TypeScript type checking
- Runs Prettier formatting check
- Runs Next.js build
- Runs Vercel build (exact deployment simulation)
- Validates build artifacts (`.next` and `.vercel/output`)

### 5. Development Tips

1. **Before committing**: Pre-commit hooks will run automatically
2. **Before pushing**: Run `npm run vercel:validate` to ensure Vercel deployment will succeed
3. **Fix formatting**: Run `npm run format:write` to auto-fix Prettier issues
4. **Fix linting**: Run `npm run lint:fix` to auto-fix ESLint issues
5. **Test Vercel deployment**: Use `npm run vercel:validate` for comprehensive validation

### 6. Files and Configuration

- `.husky/pre-commit`: Pre-commit hook script
- `.github/workflows/ci.yml`: GitHub Actions CI configuration (now includes Vercel build)
- `package.json`: NPM scripts for all quality checks and Vercel integration
- `scripts/vercel-check.js`: Comprehensive Vercel validation script
- `vercel.json`: Vercel deployment configuration
- `eslint.config.js`: ESLint configuration
- `prettier.config.js`: Prettier configuration

This multi-layer approach ensures that:
1. Basic issues are caught locally before commit
2. All issues are caught in CI before deployment
3. Vercel builds are validated exactly as they will be deployed
4. Environment variables are synchronized with Vercel
5. Build artifacts are validated for both Next.js and Vercel