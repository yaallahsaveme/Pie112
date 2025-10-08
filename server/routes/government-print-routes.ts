
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { governmentPrintIntegration } from '../services/government-print-integration';

const router = express.Router();

/**
 * Submit document for government printing
 */
router.post('/api/government/print', requireAuth, async (req, res) => {
  try {
    const result = await governmentPrintIntegration.submitPrintJob(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Process work permit application
 */
router.post('/api/government/work-permit', requireAuth, async (req, res) => {
  try {
    const result = await governmentPrintIntegration.processWorkPermit(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Check print service status
 */
router.get('/api/government/print/status', async (req, res) => {
  try {
    const status = await governmentPrintIntegration.checkPrintServiceStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as governmentPrintRoutes };
