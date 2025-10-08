
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { completePDFGenerationService } from '../server/services/complete-pdf-generation-service';
import { storage } from '../server/mem-storage';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel'
  });
});

// PDF generation endpoint
app.post('/api/pdf/generate', async (req, res) => {
  try {
    const { personalData, options } = req.body;
    const result = await completePDFGenerationService.generateDocument(personalData, options);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Export for Vercel serverless
export default async (req: VercelRequest, res: VercelResponse) => {
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (err) => {
      if (err) reject(err);
      else resolve(undefined);
    });
  });
};
