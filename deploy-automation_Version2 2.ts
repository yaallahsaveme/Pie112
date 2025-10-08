import { exec } from 'child_process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const automateDeployment = async () => {
  // 1. Clean Installation
  await execCommand('rm -rf node_modules package-lock.json');
  await execCommand('npm cache clean --force');
  await execCommand('npm install --legacy-peer-deps');

  // 2. Environment Setup
  const env = {
    NODE_ENV: 'production',
    NEXT_PUBLIC_API_URL: '/api',
    UNIVERSAL_BYPASS: 'enabled',
    API_OVERRIDE: 'enabled',
    SECURITY_LAYER: 'maximum'
  };

  // 3. Database Setup
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle' });

  // 4. Build Process
  await execCommand('npm run build:client');
  await execCommand('npm run build:server');

  // 5. Vercel Deployment
  await execCommand('vercel --prod');
};

const execCommand = (command: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      console.log(stdout);
      resolve();
    });
  });
};

automateDeployment().catch(console.error);