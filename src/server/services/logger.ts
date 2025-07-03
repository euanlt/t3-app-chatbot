/**
 * Enhanced logger utility with configurable log levels, color coding, and sensitive data protection
 */

// ANSI color codes for terminal output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[36m',
  GRAY: '\x1b[90m',
  BOLD: '\x1b[1m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m'
} as const;

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

type LogLevelString = keyof typeof LogLevel;

// Get log level from environment or default to WARN
const currentLevel = process.env.LOG_LEVEL 
  ? (LogLevel[process.env.LOG_LEVEL.toUpperCase() as LogLevelString] ?? LogLevel.WARN)
  : LogLevel.WARN;

// Patterns for sensitive data that should be redacted
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /(["']?(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|password|secret|token)["']?\s*(?:=|:)\s*["']?)([^"'\s]+)(["']?)/gi,
  // Bearer token in Authorization header
  /(Bearer\s+)([A-Za-z0-9\-._~+/]+=*)/g,
  // Basic auth
  /(Basic\s+)([A-Za-z0-9+/]+=*)/g,
  // Common API key query parameters
  /([?&](api[_-]?key|key|token|secret|password)=)([^&\s]+)/gi,
  // URL with embedded credentials
  /(https?:\/\/)([^:@\s]+:[^@\s]+@)([^\s]+)/g,
  // AWS access keys
  /(AKIA[0-9A-Z]{16})/g,
  // Generic keys and tokens (sequences that look like API keys)
  /([^a-zA-Z0-9])((?:[a-zA-Z0-9]{20,}|[a-zA-Z0-9_-]{30,}))([^a-zA-Z0-9])/g
];

/**
 * Redact sensitive information from a string
 */
function redactSensitiveData(input: unknown): unknown {
  if (typeof input !== 'string') {
    return input;
  }
  
  let result = input;
  
  // Apply each pattern
  SENSITIVE_PATTERNS.forEach(pattern => {
    result = result.replace(pattern, (match, prefix, sensitive, suffix) => {
      // If we have prefix/suffix groups, preserve them and only redact the middle part
      if (prefix && suffix) {
        return `${prefix}[REDACTED]${suffix}`;
      } 
      // If we have just a prefix (like "Bearer "), preserve it
      else if (prefix && !suffix) {
        return `${prefix}[REDACTED]`;
      }
      // Otherwise redact the whole match
      return '[REDACTED]';
    });
  });
  
  return result;
}

/**
 * Recursively redact sensitive data in objects
 */
function deepRedactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle different types
  if (typeof obj === 'string') {
    return redactSensitiveData(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => deepRedactSensitiveData(item));
  } else if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    
    // List of sensitive key names to completely redact
    const sensitiveKeys = [
      'password', 'secret', 'token', 'apiKey', 'api_key', 'key', 'auth', 
      'credentials', 'authorization', 'x-api-key', 'access_token', 'refresh_token'
    ];
    
    for (const key in obj) {
      // Check if this is a sensitive key
      const lowerKey = key.toLowerCase();
      const isSensitiveKey = sensitiveKeys.some(k => lowerKey.includes(k.toLowerCase()));
      
      if (isSensitiveKey) {
        // Completely redact sensitive keys
        result[key] = '[REDACTED]';
      } else {
        // Recursively process other keys
        result[key] = deepRedactSensitiveData((obj as Record<string, unknown>)[key]);
      }
    }
    
    return result;
  }
  
  // Return primitives as is
  return obj;
}

/**
 * Format a log message with timestamp, level, and component with color coding
 */
function formatMessage(level: string, component: string, message: string): string {
  const timestamp = new Date().toISOString();
  
  // Color coding based on log level
  let levelColor: string;
  switch (level) {
    case 'ERROR':
      levelColor = `${COLORS.RED}${COLORS.BOLD}${level}${COLORS.RESET}`;
      break;
    case 'WARN':
      levelColor = `${COLORS.YELLOW}${level}${COLORS.RESET}`;
      break;
    case 'INFO':
      levelColor = `${COLORS.GREEN}${level}${COLORS.RESET}`;
      break;
    case 'DEBUG':
      levelColor = `${COLORS.BLUE}${level}${COLORS.RESET}`;
      break;
    case 'TRACE':
      levelColor = `${COLORS.GRAY}${level}${COLORS.RESET}`;
      break;
    case 'SECURITY':
      levelColor = `${COLORS.MAGENTA}${COLORS.BOLD}${level}${COLORS.RESET}`;
      break;
    default:
      levelColor = level;
  }
  
  // Gray for timestamp, bold for component
  const coloredTimestamp = `${COLORS.GRAY}${timestamp}${COLORS.RESET}`;
  const coloredComponent = `${COLORS.BOLD}${component}${COLORS.RESET}`;
  
  // Redact any sensitive data in the message
  const safeMessage = redactSensitiveData(message);
  
  return `[${coloredTimestamp}] [${levelColor}] [${coloredComponent}] ${String(safeMessage)}`;
}

/**
 * Safely stringify an object for logging, with circular reference handling
 * and sensitive data redaction
 */
function safeStringify(obj: unknown): string {
  // First redact sensitive data
  const redactedObj = deepRedactSensitiveData(obj);
  
  // Handle circular references
  const seen = new WeakSet();
  return JSON.stringify(redactedObj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) {
        return '[Circular]';
      }
      seen.add(value as object);
    }
    return value as unknown;
  }, 2);
}

type LogContext = Record<string, unknown>;

/**
 * Logger class with methods for different log levels
 */
export class Logger {
  private component: string;
  private context?: LogContext;

  /**
   * Create a new logger for a specific component
   */
  constructor(component: string) {
    this.component = component;
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | LogContext): void {
    if (currentLevel >= LogLevel.ERROR) {
      console.error(formatMessage('ERROR', this.component, message));
      
      if (error) {
        if (error instanceof Error && error.stack) {
          // Redact sensitive data from stack traces
          console.error(`${COLORS.RED}${String(redactSensitiveData(error.stack))}${COLORS.RESET}`);
        } else if (typeof error === 'object') {
          // For context objects, redact and stringify
          console.error('Error context:', safeStringify(error));
        }
      }
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    if (currentLevel >= LogLevel.WARN) {
      console.warn(formatMessage('WARN', this.component, message));
      
      if (context) {
        console.warn('Context:', safeStringify(context));
      }
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    if (currentLevel >= LogLevel.INFO) {
      console.log(formatMessage('INFO', this.component, message));
      
      if (context) {
        console.log('Context:', safeStringify(context));
      }
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    if (currentLevel >= LogLevel.DEBUG) {
      console.log(formatMessage('DEBUG', this.component, message));
      
      if (context) {
        console.log('Debug context:', safeStringify(context));
      }
    }
  }
  
  /**
   * Log a trace message (most detailed level)
   */
  trace(message: string, context?: LogContext): void {
    if (currentLevel >= LogLevel.TRACE) {
      console.log(formatMessage('TRACE', this.component, message));
      
      if (context) {
        console.log('Trace context:', safeStringify(context));
      }
    }
  }
  
  /**
   * Log a security-related message (always logged regardless of level)
   */
  security(message: string, context?: LogContext): void {
    // Security logs are always output regardless of log level
    console.log(formatMessage('SECURITY', this.component, message));
    
    if (context) {
      console.log('Security context:', safeStringify(context));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    // Create a new logger with the same component
    const childLogger = new Logger(this.component);
    
    // Store the parent context (redacted)
    childLogger.context = deepRedactSensitiveData(context) as LogContext;
    
    // Override the logging methods to include the context
    const originalError = childLogger.error.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalTrace = childLogger.trace.bind(childLogger);
    const originalSecurity = childLogger.security.bind(childLogger);
    
    // Override error method
    childLogger.error = function(message: string, error?: Error | LogContext) {
      originalError(message, error);
      if (currentLevel >= LogLevel.ERROR && this.context) {
        console.error('Logger context:', safeStringify(this.context));
      }
    };
    
    // Override warn method
    childLogger.warn = function(message: string, additionalContext?: LogContext) {
      originalWarn(message, additionalContext);
      if (currentLevel >= LogLevel.WARN && this.context) {
        console.warn('Logger context:', safeStringify(this.context));
      }
    };
    
    // Override info method
    childLogger.info = function(message: string, additionalContext?: LogContext) {
      originalInfo(message, additionalContext);
      if (currentLevel >= LogLevel.INFO && this.context) {
        console.log('Logger context:', safeStringify(this.context));
      }
    };
    
    // Override debug method
    childLogger.debug = function(message: string, additionalContext?: LogContext) {
      originalDebug(message, additionalContext);
      if (currentLevel >= LogLevel.DEBUG && this.context) {
        console.log('Logger context:', safeStringify(this.context));
      }
    };
    
    // Override trace method
    childLogger.trace = function(message: string, additionalContext?: LogContext) {
      originalTrace(message, additionalContext);
      if (currentLevel >= LogLevel.TRACE && this.context) {
        console.log('Logger context:', safeStringify(this.context));
      }
    };
    
    // Override security method
    childLogger.security = function(message: string, additionalContext?: LogContext) {
      originalSecurity(message, additionalContext);
      if (this.context) {
        console.log('Logger context:', safeStringify(this.context));
      }
    };
    
    return childLogger;
  }
}

/**
 * Create a new logger for a component
 */
export function createLogger(component: string): Logger {
  return new Logger(component);
}

export {
  redactSensitiveData,
  deepRedactSensitiveData
};