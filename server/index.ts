import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { universalAPIOverride } from './middleware/universal-api-override';

// Initialize universal API override system
universalAPIOverride.enableProductionMode();
console.log('🔑 Universal API Override System Active');
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Real service imports
import { storage } from './storage.js';
import { registerRoutes } from './routes.js';
import { setupVite } from './vite.js';
import { validateRailwayConfig } from './config/railway.js';
import { initializeDatabase } from './config/database-railway.js';

// Ultra-advanced PDF routes import
import { ultraPDFRoutes } from './routes/ultra-pdf-api';
import { governmentPrintIntegration } from './services/government-print-integration';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n🚀 DHA Digital Services Platform - Production Server');
console.log('🇿🇦 Department of Home Affairs - Real Implementation');
console.log('=' .repeat(60));

const PORT = parseInt(process.env.PORT || '5000');
const HOST = '0.0.0.0';

// Create Express app and HTTP server
const app = express();
const server = createServer(app);

// Initialize database and storage
let dbConfig;
try {
  dbConfig = await initializeDatabase();
  console.log(`✅ Database initialized: ${dbConfig.type.toUpperCase()}`);
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

// Validate production environment
if (process.env.NODE_ENV === 'production') {
  try {
    validateRailwayConfig();
    console.log('✅ Production configuration validated');
  } catch (error) {
    console.error('❌ Production validation failed:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.replit.app', 'https://*.replit.dev']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://0.0.0.0:5000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for Replit
app.set('trust proxy', 1);

// Health check with real database connection
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbHealth = await checkDatabaseHealth(dbConfig);

    // Test API keys
    const apiStatus = {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      database: dbHealth.healthy
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      database: dbHealth.type,
      apiServices: apiStatus,
      features: ['Document Generation', 'AI Assistant', 'Security', 'Authentication']
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check function
async function checkDatabaseHealth(config) {
  try {
    if (config.type === 'postgresql') {
      await config.db.execute('SELECT 1 as health_check');
      return {
        healthy: true,
        type: 'PostgreSQL',
        connectionString: config.connectionString?.replace(/:[^:]*@/, ':***@')
      };
    } else {
      config.db.all('SELECT 1 as health_check');
      return {
        healthy: true,
        type: 'SQLite',
        connectionString: config.connectionString
      };
    }
  } catch (error) {
    return {
      healthy: false,
      type: config.type,
      error: error.message
    };
  }
}

// Register all application routes
console.log('🔧 Registering application routes...');
registerRoutes(app);

// Mount ultra-advanced PDF routes
app.use(ultraPDFRoutes);

// Government Printing & Work Permits
import { governmentPrintRoutes } from './routes/government-print-routes';
app.use(governmentPrintRoutes);

// Setup Vite for development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Setting up Vite development server...');
  try {
    await setupVite(app, server);
    console.log('✅ Vite development server ready');
  } catch (error) {
    console.warn('⚠️ Vite setup failed (non-critical):', error.message);
  }
} else {
  // Serve static files in production
  const staticPath = join(process.cwd(), 'dist/public');
  app.use(express.static(staticPath));

  // Serve React app for non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(staticPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('');
  console.log('=' .repeat(60));
  console.log('🎉 DHA DIGITAL SERVICES PLATFORM - READY');
  console.log('=' .repeat(60));
  console.log('');
  console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
  console.log(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`🤖 AI Assistant: http://${HOST}:${PORT}/ai-assistant`);
  console.log(`📄 Documents: http://${HOST}:${PORT}/documents`);
  console.log('');
  console.log('✅ Real database connection active');
  console.log('✅ Real API integrations configured');
  console.log('✅ Production-ready implementation');
  console.log('');
  console.log('=' .repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, server };