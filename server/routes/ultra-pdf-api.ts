import express from 'express';
import { ultraAdvancedPDFService } from '../services/ultra-advanced-pdf-features';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * AI-Enhanced PDF Generation
 */
router.post('/api/pdf/ai-generate', requireAuth, async (req, res) => {
  try {
    const { content, options } = req.body;

    const pdfBuffer = await ultraAdvancedPDFService.generateWithAI(content, {
      aiEnhancement: true,
      multiLayerSecurity: options?.security || true,
      blockchainVerification: options?.blockchain || true,
      dynamicWatermarking: options?.watermark || true,
      biometricEmbedding: options?.biometric || false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ai-generated-${Date.now()}.pdf"`); // Added semicolon here
    res.send(pdfBuffer);
  } catch (error) {
    console.error('AI PDF generation error:', error);
    res.status(500).json({ error: 'AI PDF generation failed' });
  }
});

/**
 * Extract PDF Information
 */
router.post('/api/pdf/extract', requireAuth, async (req, res) => {
  try {
    const pdfBuffer = req.file?.buffer || Buffer.from(req.body.pdf, 'base64');
    const info = await ultraAdvancedPDFService.extractPDFInfo(pdfBuffer);
    res.json({ success: true, data: info });
  } catch (error) {
    console.error('PDF extraction error:', error);
    res.status(500).json({ error: 'PDF extraction failed' });
  }
});

/**
 * Convert any file to PDF
 */
router.post('/api/pdf/convert', requireAuth, async (req, res) => {
  try {
    const fileBuffer = req.file?.buffer || Buffer.from(req.body.file, 'base64');
    const fileType = req.body.fileType || req.file?.mimetype || 'unknown';

    const pdfBuffer = await ultraAdvancedPDFService.convertToPDF(fileBuffer, fileType);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="converted-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF conversion error:', error);
    res.status(500).json({ error: 'PDF conversion failed' });
  }
});

/**
 * Add text to existing PDF
 */
router.post('/api/pdf/add-text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="edited-${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    });

    ultraAdvancedPDFService.addEditableLayers(doc, text);
    doc.end();
  } catch (error) {
    console.error('PDF text addition error:', error);
    res.status(500).json({ error: 'Failed to add text to PDF' });
  }
});

export { router as ultraPDFRoutes };