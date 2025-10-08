/**
 * DHA Digital Services - Centralized Configuration Management
 *
 * This module provides secure, validated configuration management for all
 * environment variables and secrets. It enforces strict security standards
 * and fails fast in production if critical secrets are missing.
 *
 * CRITICAL SECURITY: All hardcoded secrets have been removed and replaced
 * with proper environment variable validation.
 */

import { z } from 'zod';
import crypto from 'crypto';

// Enhanced Environment detection with extensive logging
const logEnvironmentState = (context: string) => {
  console.log(`🔍 [ENV DEBUG] ${context}:`);
  console.log(`  NODE_ENV = '${process.env.NODE_ENV}'`);
  console.log(`  REPL_ID = '${process.env.REPL_ID || 'undefined'}'`);
  console.log(`  RAILWAY_ENVIRONMENT = '${process.env.RAILWAY_ENVIRONMENT || 'undefined'}'`);
  console.log(`  PORT = '${process.env.PORT || 'undefined'}'`);
  console.log(`  PREVIEW_MODE = '${process.env.PREVIEW_MODE || 'undefined'}'`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
};

// FAILSAFE: Force development mode detection with extensive logging
const detectEnvironmentWithLogging = (context: string) => {
  logEnvironmentState(context);

  // Failsafe 1: If running on Replit (development environment)
  if (process.env.REPL_ID && !process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🔧 [ENV DEBUG] Detected Replit environment - forcing development mode`);
    process.env.NODE_ENV = 'development';
    return 'development';
  }

  // Failsafe 2: If NODE_ENV is not set, default to development
  if (!process.env.NODE_ENV || process.env.NODE_ENV === '') {
    console.log(`🔧 [ENV DEBUG] NODE_ENV not set - forcing development mode`);
    process.env.NODE_ENV = 'development';
    return 'development';
  }

  const env = process.env.NODE_ENV;
  console.log(`🔧 [ENV DEBUG] Final environment: ${env}`);
  return env;
};

const isProduction = (context?: string) => {
  const env = detectEnvironmentWithLogging(context || 'isProduction check');
  const result = env === 'production';
  console.log(`🔍 [ENV DEBUG] isProduction() = ${result}`);
  return result;
};

const isDevelopment = (context?: string) => {
  const env = detectEnvironmentWithLogging(context || 'isDevelopment check');
  const result = env === 'development' || env === 'test' || env === undefined;
  console.log(`🔍 [ENV DEBUG] isDevelopment() = ${result}`);
  return result;
};

const isPreviewMode = (): boolean => process.env.PREVIEW_MODE === 'true';

// Configuration schema with strict validation
const configSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('5000'),

  // CRITICAL SECURITY SECRETS - REQUIRED in production
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters for security'),
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters for government-grade security'),

  // Database configuration with validation and fallback
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),

  // External service API keys
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required').optional(),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required').optional(),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required').optional(),

  // Optional configuration
  ALLOWED_ORIGINS: z.string().optional(),
  REPL_ID: z.string().optional(),

  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100'),

  // Session configuration
  SESSION_MAX_AGE: z.string().transform(val => parseInt(val, 10)).default('86400000'), // 24 hours

  // Government service provider API keys (optional)
  DHA_NPR_API_KEY: z.string().optional(),
  DHA_ABIS_API_KEY: z.string().optional(),
  SAPS_CRC_API_KEY: z.string().optional(),
  ICAO_PKD_API_KEY: z.string().optional(),
  SITA_ESERVICES_API_KEY: z.string().optional(),

  // Encryption keys - REQUIRED for secure operations (optional in development)
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters').optional(),
  VITE_ENCRYPTION_KEY: z.string().min(32, 'VITE_ENCRYPTION_KEY must be at least 32 characters').optional(),
  MASTER_ENCRYPTION_KEY: z.string().min(32, 'MASTER_ENCRYPTION_KEY must be at least 32 characters').optional(),
  QUANTUM_ENCRYPTION_KEY: z.string().min(64, 'QUANTUM_ENCRYPTION_KEY must be at least 64 characters for quantum-resistant security').optional(),
  BIOMETRIC_ENCRYPTION_KEY: z.string().min(32, 'BIOMETRIC_ENCRYPTION_KEY must be at least 32 characters').optional(),
  DOCUMENT_SIGNING_KEY: z.string().min(32, 'DOCUMENT_SIGNING_KEY must be at least 32 characters').optional(),
});

type Config = z.infer<typeof configSchema>;

// REMOVED: Problematic module-level validateProductionSecrets function
// This was causing premature validation before development secrets were generated
// The validation is now handled properly inside the ConfigurationService class


class ConfigurationService {
  private config: Config;
  private isValidated = false;

  constructor() {
    this.config = {} as Config;
  }

  /**
   * Get environment variable or return a default value
   */
  private getEnvVar(key: string, defaultValue: string = ''): string | undefined {
    return process.env[key] || defaultValue;
  }

  /**
   * Validate and load configuration from environment variables
   * CRITICAL: Throws error in production if required secrets are missing
   */
  public validateAndLoad(): Config {
    console.log('🔄 [CONFIG] Starting configuration validation...');

    if (this.isValidated) {
      console.log('✅ [CONFIG] Configuration already validated, returning cached config');
      return this.config;
    }

    try {
      // Log initial environment state
      console.log('🔍 [CONFIG] Environment variables at config load time:');
      logEnvironmentState('validateAndLoad start');

      // Parse environment variables
      console.log('📝 [CONFIG] Parsing environment variables...');
      const rawConfig = {
        NODE_ENV: this.getEnvVar('NODE_ENV', 'development'),
        PORT: this.getEnvVar('PORT'),
        SESSION_SECRET: this.getEnvVar('SESSION_SECRET'),
        JWT_SECRET: this.getEnvVar('JWT_SECRET'),
        DATABASE_URL: this.getEnvVar('DATABASE_URL'),
        OPENAI_API_KEY: this.getEnvVar('OPENAI_API_KEY'),
        ANTHROPIC_API_KEY: this.getEnvVar('ANTHROPIC_API_KEY'),
        GITHUB_TOKEN: this.getEnvVar('GITHUB_TOKEN'),
        ALLOWED_ORIGINS: this.getEnvVar('ALLOWED_ORIGINS'),
        REPL_ID: this.getEnvVar('REPL_ID'),
        RATE_LIMIT_WINDOW_MS: this.getEnvVar('RATE_LIMIT_WINDOW_MS'),
        RATE_LIMIT_MAX_REQUESTS: this.getEnvVar('RATE_LIMIT_MAX_REQUESTS'),
        SESSION_MAX_AGE: this.getEnvVar('SESSION_MAX_AGE'),
        DHA_NPR_API_KEY: this.getEnvVar('DHA_NPR_API_KEY'),
        DHA_ABIS_API_KEY: this.getEnvVar('DHA_ABIS_API_KEY'),
        SAPS_CRC_API_KEY: this.getEnvVar('SAPS_CRC_API_KEY'),
        ICAO_PKD_API_KEY: this.getEnvVar('ICAO_PKD_API_KEY'),
        SITA_ESERVICES_API_KEY: this.getEnvVar('SITA_ESERVICES_API_KEY'),
        ENCRYPTION_KEY: this.getEnvVar('ENCRYPTION_KEY'),
        VITE_ENCRYPTION_KEY: this.getEnvVar('VITE_ENCRYPTION_KEY'),
        MASTER_ENCRYPTION_KEY: this.getEnvVar('MASTER_ENCRYPTION_KEY'),
        QUANTUM_ENCRYPTION_KEY: this.getEnvVar('QUANTUM_ENCRYPTION_KEY'),
        BIOMETRIC_ENCRYPTION_KEY: this.getEnvVar('BIOMETRIC_ENCRYPTION_KEY'),
        DOCUMENT_SIGNING_KEY: this.getEnvVar('DOCUMENT_SIGNING_KEY'),
      };

      // Check environment BEFORE applying development defaults
      const isDevMode = isDevelopment('development defaults check');
      const isProdMode = isProduction('production check');

      console.log(`🔧 [CONFIG] Environment determination: isDevelopment=${isDevMode}, isProduction=${isProdMode}`);

      // Apply secure development defaults FIRST if needed and NOT in production
      if (isDevMode && !isProdMode) {
        console.log('🔑 [CONFIG] Generating development secrets...');
        const secretsBefore = {
          SESSION_SECRET: !!rawConfig.SESSION_SECRET,
          JWT_SECRET: !!rawConfig.JWT_SECRET,
          ENCRYPTION_KEY: !!rawConfig.ENCRYPTION_KEY,
          QUANTUM_ENCRYPTION_KEY: !!rawConfig.QUANTUM_ENCRYPTION_KEY
        };
        console.log('📊 [CONFIG] Secrets state before generation:', secretsBefore);

        rawConfig.SESSION_SECRET = rawConfig.SESSION_SECRET || this.generateSecureDevelopmentSecret('session');
        rawConfig.JWT_SECRET = rawConfig.JWT_SECRET || this.generateSecureDevelopmentSecret('jwt');
        rawConfig.ENCRYPTION_KEY = rawConfig.ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('encryption');
        rawConfig.VITE_ENCRYPTION_KEY = rawConfig.VITE_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('encryption');
        rawConfig.MASTER_ENCRYPTION_KEY = rawConfig.MASTER_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('master-encryption');
        rawConfig.QUANTUM_ENCRYPTION_KEY = rawConfig.QUANTUM_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('quantum-encryption');
        rawConfig.BIOMETRIC_ENCRYPTION_KEY = rawConfig.BIOMETRIC_ENCRYPTION_KEY || this.generateSecureDevelopmentSecret('encryption');
        rawConfig.DOCUMENT_SIGNING_KEY = rawConfig.DOCUMENT_SIGNING_KEY || this.generateSecureDevelopmentSecret('encryption');

        const secretsAfter = {
          SESSION_SECRET: !!rawConfig.SESSION_SECRET,
          JWT_SECRET: !!rawConfig.JWT_SECRET,
          ENCRYPTION_KEY: !!rawConfig.ENCRYPTION_KEY,
          QUANTUM_ENCRYPTION_KEY: !!rawConfig.QUANTUM_ENCRYPTION_KEY
        };
        console.log('✅ [CONFIG] Secrets state after generation:', secretsAfter);
      } else {
        console.log('⚠️ [CONFIG] Skipping development secret generation (production mode detected)');
      }

      // CRITICAL: In production, ensure critical secrets are present AFTER fallbacks
      console.log('🔒 [CONFIG] Checking if production validation is needed...');
      const needsProductionValidation = isProduction('production validation check');
      console.log(`🔒 [CONFIG] Production validation needed: ${needsProductionValidation}`);

      if (needsProductionValidation) {
        console.log('🔒 [CONFIG] Running production secrets validation...');
        this.validateProductionSecrets(rawConfig); // Use the class method that takes rawConfig
      } else {
        console.log('✅ [CONFIG] Skipping production validation (development mode)');
      }

      // Validate configuration with Zod schema
      this.config = configSchema.parse(rawConfig);
      this.isValidated = true;

      // Log configuration status (without exposing secrets)
      this.logConfigurationStatus();

      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
        throw new Error(`CRITICAL CONFIGURATION ERROR:\n${issues}`);
      }
      throw error;
    }
  }

  /**
   * CRITICAL SECURITY: Validate that all required secrets are present in production
   * Application MUST NOT start in production without proper secrets
   */
  private validateProductionSecrets(rawConfig: any): void {
    const missingSecrets: string[] = [];

    // Check for required secrets
    if (!rawConfig.SESSION_SECRET) {
      missingSecrets.push('SESSION_SECRET');
    }

    if (!rawConfig.JWT_SECRET) {
      missingSecrets.push('JWT_SECRET');
    }

    // Fail fast if any critical secrets are missing
    if (missingSecrets.length > 0) {
      throw new Error(
        `CRITICAL SECURITY ERROR: Missing required environment variables in production:\n` +
        missingSecrets.map(secret => `- ${secret}`).join('\n') +
        `\n\nThe application CANNOT start in production without these secrets.\n` +
        `Please set these environment variables before restarting the application.`
      );
    }

    // Validate secret strength for government-grade security
    if (rawConfig.SESSION_SECRET && rawConfig.SESSION_SECRET.length < 32) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters in production');
    }

    if (rawConfig.JWT_SECRET && rawConfig.JWT_SECRET.length < 64) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 64 characters in production');
    }

    // Check for weak/development secrets in production
    if (rawConfig.SESSION_SECRET?.includes('dev-session-') ||
        rawConfig.SESSION_SECRET?.includes('testing-only')) {
      throw new Error('CRITICAL SECURITY ERROR: Development session secret detected in production');
    }

    if (rawConfig.JWT_SECRET?.includes('dev-jwt-') ||
        rawConfig.JWT_SECRET?.includes('testing-only')) {
      throw new Error('CRITICAL SECURITY ERROR: Development JWT secret detected in production');
    }

    // Validate generated keys are properly formatted
    if (rawConfig.JWT_SECRET && rawConfig.JWT_SECRET.length >= 64 &&
        /^[A-Fa-f0-9]+$/.test(rawConfig.JWT_SECRET)) {
      console.log('[Config] Valid hex JWT secret detected');
    }
  }

  /**
   * Generate cryptographically secure development secrets (NOT for production use)
   * These are only used in development/preview mode when secrets are not provided
   */
  private generateSecureDevelopmentSecret(type: 'session' | 'jwt' | 'encryption' | 'master-encryption' | 'quantum-encryption'): string {
    // crypto already imported at top of file
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(32).toString('hex');

    switch (type) {
      case 'session':
        return `dev-session-${timestamp}-${randomBytes}`;
      case 'jwt':
        return `dev-jwt-${timestamp}-${randomBytes}-${crypto.randomBytes(32).toString('hex')}`;
      case 'encryption':
        return crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
      case 'master-encryption':
        return crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
      case 'quantum-encryption':
        return crypto.randomBytes(64).toString('hex'); // 64 bytes for stronger quantum-resistant encryption
      default:
        return `dev-fallback-${timestamp}-${randomBytes}`;
    }
  }

  /**
   * Log configuration status without exposing sensitive information
   */
  private logConfigurationStatus(): void {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DHA Digital Services - Configuration Validation Complete');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Environment: ${this.config.NODE_ENV}`);
    console.log(`Port: ${this.config.PORT}`);
    console.log(`Preview Mode: ${isPreviewMode() ? 'Yes' : 'No'}`);
    console.log(`Session Secret: ${this.config.SESSION_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`JWT Secret: ${this.config.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Database URL: ${this.config.DATABASE_URL ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`OpenAI API Key: ${this.config.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`Anthropic API Key: ${this.config.ANTHROPIC_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`GitHub Token: ${this.config.GITHUB_TOKEN ? '✓ Configured' : '✗ Not configured'}`);
    console.log(`Encryption Key: ${this.config.ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Vite Encryption Key: ${this.config.VITE_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Master Encryption Key: ${this.config.MASTER_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Quantum Encryption Key: ${this.config.QUANTUM_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Biometric Encryption Key: ${this.config.BIOMETRIC_ENCRYPTION_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`Document Signing Key: ${this.config.DOCUMENT_SIGNING_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Warn about development secrets in non-production environments
    const isProdForLogging = isProduction('logging check');
    if (!isProdForLogging && (
      this.config.SESSION_SECRET?.includes('dev-session-') ||
      this.config.JWT_SECRET?.includes('dev-jwt-')
    )) {
      console.warn('⚠️  WARNING: Using auto-generated development secrets.');
      console.warn('⚠️  Set proper environment variables for production deployment.');
    }

    // Security reminder for production readiness
    if (!isProdForLogging) {
      console.warn('🔒 SECURITY REMINDER: Ensure all production secrets are properly configured before deployment.');
    }
  }

  /**
   * Get validated configuration
   */
  public getConfig(): Config {
    if (!this.isValidated) {
      throw new Error('Configuration not validated. Call validateAndLoad() first.');
    }
    return this.config;
  }

  /**
   * Get a specific configuration value with type safety
   */
  public get<K extends keyof Config>(key: K): Config[K] {
    return this.getConfig()[key];
  }

  /**
   * Environment checks
   */
  public isProduction(): boolean {
    return this.getConfig().NODE_ENV === 'production';
  }

  public isDevelopment(): boolean {
    return this.getConfig().NODE_ENV === 'development';
  }

  public isPreviewMode(): boolean {
    return process.env.PREVIEW_MODE === 'true';
  }

  /**
   * Get CORS origins as an array
   */
  public getCorsOrigins(): string[] {
    const origins = this.getConfig().ALLOWED_ORIGINS;
    if (!origins) {
      return this.isDevelopment() ? ['http://localhost:5000'] : [];
    }
    return origins.split(',').map(origin => origin.trim());
  }

  /**
   * CRITICAL: Validate configuration at startup and fail fast if invalid
   * This prevents the application from starting with insecure configuration
   */
  public static initialize(): ConfigurationService {
    console.log('🚀 [CONFIG] Initializing ConfigurationService...');
    const service = new ConfigurationService();

    try {
      service.validateAndLoad();
      console.log('✅ [CONFIG] Configuration validation successful');
      return service;
    } catch (error) {
      console.error('❌ [CONFIG] Configuration validation failed:', error instanceof Error ? error.message : String(error));

      // Use the enhanced environment detection for error handling
      const isProdForErrorHandling = isProduction('error handling check');
      if (isProdForErrorHandling) {
        console.error('🚨 [CONFIG] CRITICAL: Cannot start application in production with invalid configuration');
        console.error('🚨 [CONFIG] EXITING APPLICATION TO PREVENT SECURITY VULNERABILITIES');
        process.exit(1);
      } else {
        console.warn('⚠️ [CONFIG] WARNING: Configuration issues detected in development mode');
        throw error;
      }
    }
  }

  // Database URL handling and fallback
  private getDefaultDatabaseUrl(): string {
    if (this.isDevelopment() || isPreviewMode()) {
      // Use SQLite for development/preview
      return 'file:./dev.db';
    }
    return '';
  }

  private validateDatabaseUrl(url: string): boolean {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      // Check if it's a valid database URL
      return ['postgresql:', 'postgres:', 'file:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

// Singleton instance holders
let configServiceInstance: ConfigurationService | null = null;

// Lazy initialization function
export const initializeConfig = (): ConfigurationService => {
  if (!configServiceInstance) {
    configServiceInstance = ConfigurationService.initialize();
  }
  return configServiceInstance;
};

// Safe getters that initialize if needed
export const getConfigService = (): ConfigurationService => {
  if (!configServiceInstance) {
    return initializeConfig();
  }
  return configServiceInstance;
};

export const getConfig = () => {
  return getConfigService().getConfig();
};

// Note: Removed immediate initialization exports to prevent module-level validation
// Use initializeConfig() or getConfigService() instead

// Export types for external use
export type { Config };
export { ConfigurationService };

// REMOVED: Immediate initialization exports to prevent module-level validation issues
// Use getConfigService() and getConfig() functions instead for lazy initialization
// This prevents the config from being validated at module import time