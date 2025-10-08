import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  UNIVERSAL_BYPASS: z.enum(['enabled', 'disabled']),
  API_OVERRIDE: z.enum(['enabled', 'disabled']),
  SECURITY_LAYER: z.enum(['maximum', 'medium', 'minimum'])
});

const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten());
    process.exit(1);
  }
  console.log('✅ Environment variables are valid');
};

validateEnv();