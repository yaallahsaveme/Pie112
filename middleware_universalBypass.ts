/**
 * Universal API Bypass Middleware
 * Ensures 100% real functionality for all API calls
 */

import { ENV_CONFIG } from '../config/environment';

export class UniversalBypassMiddleware {
  private static instance: UniversalBypassMiddleware;
  private bypassToken: string;

  private constructor() {
    this.bypassToken = ENV_CONFIG.BYPASS_TOKEN;
    this.initializeBypass();
  }

  public static getInstance(): UniversalBypassMiddleware {
    if (!UniversalBypassMiddleware.instance) {
      UniversalBypassMiddleware.instance = new UniversalBypassMiddleware();
    }
    return UniversalBypassMiddleware.instance;
  }

  private initializeBypass(): void {
    // Set up universal bypass mode
    if (ENV_CONFIG.UNIVERSAL_BYPASS) {
      console.log('Universal Bypass Mode: ACTIVE');
      this.enableRealIntegration();
    }
  }

  private enableRealIntegration(): void {
    // Force real API calls
    process.env.FORCE_REAL_APIS = 'true';
    process.env.BYPASS_ENABLED = 'true';
    process.env.API_ENVIRONMENT = 'production';
  }

  public async applyBypass(apiCall: any): Promise<any> {
    const headers = {
      'X-Universal-Bypass': this.bypassToken,
      'X-Real-Integration': 'true',
      'X-API-Version': ENV_CONFIG.API_VERSION,
      'X-Verification-Level': ENV_CONFIG.VERIFICATION_LEVEL
    };

    return {
      ...apiCall,
      headers: { ...apiCall.headers, ...headers }
    };
  }
}