#!/usr/bin/env node

/**
 * Comprehensive Vercel build validation script
 * This script simulates the exact Vercel deployment process locally
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description, options = {}) {
  log(`\n${colors.blue}🔧 ${description}...${colors.reset}`);

  try {
    const output = execSync(command, {
      stdio: "pipe",
      encoding: "utf8",
      ...options,
    });

    if (output.trim()) {
      console.log(output);
    }

    log(
      `${colors.green}✅ ${description} completed successfully${colors.reset}`,
    );
    return true;
  } catch (error) {
    log(`${colors.red}❌ ${description} failed:${colors.reset}`);
    console.error(error.stdout || error.message);
    return false;
  }
}

function checkDirectory(path, description) {
  if (existsSync(path)) {
    log(`${colors.green}✅ ${description} exists at ${path}${colors.reset}`);
    return true;
  } else {
    log(`${colors.red}❌ ${description} not found at ${path}${colors.reset}`);
    return false;
  }
}

async function main() {
  log(`${colors.blue}🚀 Starting Vercel Build Validation${colors.reset}`);
  log(
    `${colors.yellow}This script will run the exact same build process as Vercel deployment${colors.reset}`,
  );

  const steps = [
    {
      name: "Pull latest environment variables",
      command: "vercel pull --yes",
      required: false, // Not required if not authenticated
      skipOnAuth: true, // Skip if not authenticated
    },
    {
      name: "Run ESLint with zero warnings",
      command: "npm run lint -- --max-warnings 0",
      required: true,
    },
    {
      name: "Run TypeScript type checking",
      command: "npm run typecheck",
      required: true,
    },
    {
      name: "Run Prettier formatting check",
      command: "npm run format:check",
      required: true,
    },
    {
      name: "Run Next.js build",
      command: "npm run build",
      required: true,
    },
    {
      name: "Run Vercel build (exact deployment simulation)",
      command: "vercel build --yes",
      required: false, // Not required if not authenticated
      skipOnAuth: true, // Skip if not authenticated
    },
  ];

  let allPassed = true;

  for (const step of steps) {
    if (step.skipOnAuth) {
      // Check if user is authenticated with Vercel
      try {
        execSync("vercel whoami", { stdio: "pipe" });
      } catch (error) {
        log(
          `${colors.yellow}⚠️  Skipping ${step.name} - Vercel authentication required${colors.reset}`,
        );
        log(
          `${colors.yellow}   Run 'vercel login' to enable this check${colors.reset}`,
        );
        continue;
      }
    }

    const success = runCommand(step.command, step.name, {
      env: { ...process.env, SKIP_ENV_VALIDATION: "1" },
    });

    if (!success && step.required) {
      allPassed = false;
      break;
    }
  }

  if (allPassed) {
    log(`\n${colors.blue}🔍 Checking build artifacts...${colors.reset}`);

    const artifacts = [
      { path: ".next", description: "Next.js build output", required: true },
      {
        path: ".vercel/output",
        description: "Vercel build output",
        required: false,
      },
    ];

    for (const artifact of artifacts) {
      const exists = checkDirectory(artifact.path, artifact.description);
      if (!exists && artifact.required) {
        allPassed = false;
      }
    }
  }

  if (allPassed) {
    log(
      `\n${colors.green}🎉 All checks passed! Your project is ready for Vercel deployment.${colors.reset}`,
    );
    log(
      `${colors.yellow}💡 You can now safely commit and push your changes.${colors.reset}`,
    );
    process.exit(0);
  } else {
    log(
      `\n${colors.red}❌ Some checks failed. Please fix the issues before deploying.${colors.reset}`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  log(`${colors.red}❌ Script failed: ${error.message}${colors.reset}`);
  process.exit(1);
});
