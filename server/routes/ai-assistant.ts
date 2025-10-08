/**
 * AI Assistant Routes - Advanced Multi-Language Chat System
 * 
 * This module provides comprehensive AI assistant endpoints with:
 * - Voice interaction capabilities (STT/TTS)
 * - Real-time validation and form assistance
 * - Multi-language support for all 11 SA languages
 * - Document processing and OCR integration
 * - Government database real-time verification
 * - Streaming responses for better UX
 */

import express from 'express';
import multer from 'multer';
import { Anthropic } from '@anthropic-ai/sdk';
import { AIAssistantService } from '../services/ai-assistant';
import { MilitaryGradeAIAssistant } from '../services/military-grade-ai-assistant';
import { enhancedVoiceService } from '../services/enhanced-voice-service';
import { realTimeValidationService } from '../services/real-time-validation-service';
import { enhancedSAOCR } from '../services/enhanced-sa-ocr';
import { AIOCRIntegrationService } from '../services/ai-ocr-integration';
import { documentProcessorService } from '../services/document-processor';
import { consentMiddleware } from '../middleware/consent-middleware';
import { storage } from '../storage';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { aiRateLimit } from '../middleware/enhanced-rate-limit.js';
import { productionConfig as config } from '../config/production.js';

// *** START EDITED CODE ***
import { Router } from 'express';
import OpenAI from 'openai';

const router = express.Router();
const aiAssistant = new AIAssistantService();
const militaryGradeAI = new MilitaryGradeAIAssistant();

// Initialize real AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
}) : null;

// Real AI chat endpoint
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, provider = 'auto', conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    let response = null;
    let usedProvider = null;

    // Try OpenAI first
    if ((provider === 'auto' || provider === 'openai') && openai) {
      try {
        console.log('🧠 Using OpenAI GPT-4 for response...');

        const messages = [
          {
            role: 'system',
            content: `You are an AI assistant for the Department of Home Affairs (DHA) Digital Services Platform. 
            Help users with document generation, government processes, and general inquiries. 
            Be professional, helpful, and accurate. If you cannot help with something, explain why clearly.`
          },
          ...conversationHistory.slice(-10), // Keep last 10 messages for context
          { role: 'user', content: message }
        ];

        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        });

        response = completion.choices[0].message.content;
        usedProvider = 'openai';

      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError.message);
        if (provider === 'openai') {
          return res.status(500).json({
            success: false,
            error: 'OpenAI API error: ' + openaiError.message
          });
        }
      }
    }

    // Try Anthropic if OpenAI failed or not available
    if (!response && (provider === 'auto' || provider === 'anthropic') && anthropic) {
      try {
        console.log('🎭 Using Anthropic Claude for response...');

        const completion = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          temperature: 0.7,
          system: `You are an AI assistant for the Department of Home Affairs (DHA) Digital Services Platform. 
          Help users with document generation, government processes, and general inquiries. 
          Be professional, helpful, and accurate.`,
          messages: [
            ...conversationHistory.slice(-10),
            { role: 'user', content: message }
          ]
        });

        response = completion.content[0].text;
        usedProvider = 'anthropic';

      } catch (anthropicError) {
        console.error('Anthropic API error:', anthropicError.message);
        if (provider === 'anthropic') {
          return res.status(500).json({
            success: false,
            error: 'Anthropic API error: ' + anthropicError.message
          });
        }
      }
    }

    if (!response) {
      return res.status(503).json({
        success: false,
        error: 'No AI providers available. Please check API key configuration.',
        availableProviders: {
          openai: !!openai,
          anthropic: !!anthropic
        }
      });
    }

    res.json({
      success: true,
      response,
      provider: usedProvider,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get available AI providers
router.get('/providers', (req, res) => {
  const providers = {
    openai: {
      available: !!openai,
      model: 'gpt-4-turbo-preview',
      capabilities: ['chat', 'code', 'analysis']
    },
    anthropic: {
      available: !!anthropic,
      model: 'claude-3-sonnet-20240229',
      capabilities: ['chat', 'analysis', 'writing']
    }
  };

  const availableCount = Object.values(providers).filter(p => p.available).length;

  res.json({
    success: true,
    providers,
    availableCount,
    recommendedProvider: availableCount > 0 ? 'auto' : null
  });
});

// AI service health check
router.get('/health', async (req, res) => {
  const health = {
    openai: { available: false, status: 'unconfigured' },
    anthropic: { available: false, status: 'unconfigured' }
  };

  // Test OpenAI
  if (openai) {
    try {
      await openai.models.list();
      health.openai = { available: true, status: 'healthy' };
    } catch (error) {
      health.openai = { available: false, status: 'error', error: error.message };
    }
  }

  // Test Anthropic
  if (anthropic) {
    try {
      // Simple test message
      await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      health.anthropic = { available: true, status: 'healthy' };
    } catch (error) {
      health.anthropic = { available: false, status: 'error', error: error.message };
    }
  }

  const overallHealth = Object.values(health).some(h => h.available);

  res.json({
    success: true,
    overall: overallHealth ? 'healthy' : 'no_providers',
    services: health,
    timestamp: new Date().toISOString()
  });
});

// *** END EDITED CODE ***


// Configure multer for audio and document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Allow audio files for voice input
    if (file.fieldname === 'audio') {
      const allowedAudioTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];
      if (allowedAudioTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid audio file type'));
      }
    }
    // Allow documents for OCR processing
    else if (file.fieldname === 'document' || file.fieldname === 'passportImage') {
      const allowedDocTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (allowedDocTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid document file type'));
      }
    } else {
      cb(new Error('Invalid field name'));
    }
  }
});

// ===================== AI CHAT ENDPOINTS =====================

/**
 * AI Model Health Check Endpoint - Tests real Anthropic connectivity
 */
router.get('/health', aiRateLimit, asyncHandler(async (req, res) => {
  try {
    // Test actual Anthropic API connectivity with minimal request
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || config.anthropicApiKey
    });
    
    const healthTestResponse = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1, // Minimal token usage to reduce cost
      messages: [{
        role: "user",
        content: "OK"
      }]
    });
    
    const isHealthy = healthTestResponse.content && healthTestResponse.content.length > 0;
    
    res.json({
      status: isHealthy ? "healthy" : "degraded",
      aiModelActive: isHealthy,
      model: "claude-3-5-sonnet-20241022",
      version: "Latest December 2024",
      militaryGradeEnabled: true,
      lastTest: new Date().toISOString(),
      testResponse: isHealthy ? "Connected" : "Failed"
    });
  } catch (error) {
    console.error('AI health check failed:', error);
    res.status(503).json({
      status: "degraded",
      error: "AI model connectivity issue",
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * ADMIN-ONLY AI Chat Endpoint with Military-Grade Security
 */
router.post('/admin/chat', requireAuth, requireRole(['admin']), aiRateLimit, asyncHandler(async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = (req as any).user.id;
    
    // Security: Server-side admin verification (ignore client flags)
    const isAdmin = (req as any).user.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "AI Assistant access restricted to administrators only"
      });
    }
    
    // Use enhanced AI assistant with admin mode enabled (hardcoded server-side)
    const response = await aiAssistant.generateResponse(
      message,
      userId,
      conversationId || 'admin-chat',
      true,
      {
        adminMode: true,        // Server-controlled: bypass all restrictions
        bypassRestrictions: true, // Server-controlled: no content filtering
        militaryMode: true,      // Server-controlled: military-grade capabilities
        language: 'en'
      }
    );
    
    res.json({
      success: response.success,
      content: response.content,
      adminMode: true,
      metadata: response.metadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Admin AI chat error:', error);
    res.status(500).json({
      success: false,
      error: "AI service temporarily unavailable"
    });
  }
}));

/**
 * Regular AI Chat Endpoint (with consent checking and POPIA compliance)
 */
router.post('/chat', requireAuth, aiRateLimit, asyncHandler(async (req, res) => {
  try {
    const { message, conversationId, includeContext = true, language = 'en' } = req.body;
    const userId = (req as any).user.id;
    
    // Enforce consent for AI processing (POPIA compliance)
    const consentStatus = await consentMiddleware.getConsentStatus(userId);
    if (!consentStatus.aiProcessing) {
      return res.status(403).json({
        success: false,
        error: "AI processing consent required",
        code: "CONSENT_REQUIRED", 
        message: "You must provide consent for AI processing to use this feature",
        compliance: "POPIA_COMPLIANCE_REQUIRED"
      });
    }
    
    // Regular users get standard AI with consent requirements
    const response = await aiAssistant.generateResponse(
      message,
      userId,
      conversationId || 'user-chat',
      includeContext,
      {
        language,
        enablePIIRedaction: true,  // Always enabled for regular users
        adminMode: false           // Never enabled for regular users
      }
    );
    
    res.json({
      success: response.success,
      content: response.content,
      suggestions: response.suggestions,
      actionItems: response.actionItems,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('User AI chat error:', error);
    res.status(500).json({
      success: false,
      error: "AI service temporarily unavailable"
    });
  }
}));

/**
 * Military-Grade AI Endpoint (admin-only compatibility route)
 */
router.post('/military', requireAuth, requireRole(['admin']), aiRateLimit, asyncHandler(async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = (req as any).user.id;
    
    const response = await militaryGradeAI.processCommand({
      message,
      commandType: 'GENERAL_QUERY' as any,
      classificationLevel: 'UNCLASSIFIED' as any,
      userContext: {
        userId,
        clearanceLevel: 'TOP_SECRET_CLEARED' as any,
        militaryRole: 'COMMANDING_OFFICER' as any,
        lastSecurityValidation: new Date(),
        accessibleClassifications: [],
        specialAccessPrograms: [],
        commandAuthority: true,
        auditTrailRequired: true
      },
      conversationId: conversationId || 'military-chat'
    });
    
    res.json({
      success: response.success,
      content: response.content,
      classificationLevel: response.classificationLevel,
      auditEntry: response.auditEntry,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Military AI chat error:', error);
    res.status(500).json({
      success: false,
      error: "Military AI service temporarily unavailable"
    });
  }
}));

/**
 * Disabled: Old chat route - replaced with properly secured routes above
 */
// router.post('/chat', requireAuth, async (req, res) => {
//   try {
//     const { message, conversationId, includeContext = true, language = 'en', enableVoice = false, documentContext, formData } = req.body;
//     const userId = (req as any).user.id;
//
//     // Validate required fields
//     if (!message || typeof message !== 'string') {
//       return res.status(400).json({
//         success: false,
//         error: 'Message is required and must be a string'
//       });
//     }
//
//     // Check if streaming is requested
//     const isStreamingRequest = req.headers.accept === 'text/event-stream';
//
//     if (isStreamingRequest) {
//       // Set up Server-Sent Events
//       res.writeHead(200, {
//         'Content-Type': 'text/event-stream',
//         'Cache-Control': 'no-cache',
//         'Connection': 'keep-alive',
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Headers': 'Cache-Control'
//       });
//
//       try {
//         // Process the message and stream response
//         const response = await aiAssistant.streamResponse(
//           message,
//           userId,
//           conversationId,
//           (chunk: string) => {
//             res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
//           },
//           includeContext,
//           {
//             language,
//             documentContext,
//             enablePIIRedaction: true
//           }
//         );
//
//         // Send final response
//         res.write(`data: ${JSON.stringify({ type: 'complete', ...response })}\n\n`);
//         res.write('data: [DONE]\n\n');
//         res.end();
//
//       } catch (error) {
//         res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'AI service error' })}\n\n`);
//         res.end();
//       }
//     } else {
//       // Regular request-response
//       const response = await aiAssistant.generateResponse(
//         message,
//         userId,
//         conversationId,
//         includeContext,
//         {
//           language,
//           documentContext,
//           enablePIIRedaction: true
//         }
//       );
//
//       // Add real-time validation if form data provided
//       if (formData && response.success) {
//         const validationResponse = await realTimeValidationService.validateRealTime({
//           userId,
//           documentType: formData.documentType || 'general',
//           fieldName: 'message_context',
//           fieldValue: message,
//           formData,
//           validationType: 'form'
//         });
//
//         response.realTimeValidation = {
//           isValid: validationResponse.isValid,
//           validationErrors: validationResponse.errors,
//           governmentVerification: validationResponse.governmentVerification
//         };
//       }
//
//       // Generate voice response if requested
//       if (enableVoice && response.success && response.content) {
//         try {
//           const voiceResponse = await enhancedVoiceService.textToSpeech(response.content, {
//             language,
//             voice: 'female',
//             format: 'mp3'
//           });
//
//           if (voiceResponse.success) {
//             response.voiceResponse = {
//               audioUrl: voiceResponse.audioUrl,
//               duration: voiceResponse.duration,
//               language
//             };
//           }
//         } catch (voiceError) {
//           console.warn('Voice generation failed:', voiceError);
//         }
//       }
//
//       res.json(response);
//     }
//
//   } catch (error) {
//     console.error('AI chat error:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Internal server error'
//     });
//   }
// });
//
/**
 * POST /api/ai/voice/stt - Speech to Text
 */
router.post('/voice/stt', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const { language = 'en', enableVoiceAuth = false } = req.body;
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    const result = await enhancedVoiceService.speechToText(req.file.buffer, {
      language,
      enableVoiceAuth: enableVoiceAuth === 'true'
    });

    // Log voice interaction
    await storage.createSecurityEvent({
      userId,
      eventType: 'voice_stt_request',
      severity: 'low',
      details: {
        language,
        audioSize: req.file.size,
        success: result.success,
        transcript: result.success ? result.transcript.substring(0, 50) + '...' : null
      }
    });

    res.json(result);

  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Voice processing error'
    });
  }
});

/**
 * POST /api/ai/voice/tts - Text to Speech
 */
router.post('/voice/tts', requireAuth, async (req, res) => {
  try {
    const { text, language = 'en', voice = 'female' } = req.body;
    const userId = (req as any).user.id;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = await enhancedVoiceService.textToSpeech(text, {
      language,
      voice,
      format: 'mp3'
    });

    // Log TTS request
    await storage.createSecurityEvent({
      userId,
      eventType: 'voice_tts_request',
      severity: 'low',
      details: {
        language,
        voice,
        textLength: text.length,
        success: result.success
      }
    });

    res.json(result);

  } catch (error) {
    console.error('Text-to-speech error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Voice generation error'
    });
  }
});

/**
 * POST /api/ai/voice/streaming/start - Start streaming STT session
 */
router.post('/voice/streaming/start', requireAuth, async (req, res) => {
  try {
    const { language = 'en', enableVoiceAuth = false } = req.body;
    const userId = (req as any).user.id;

    const streamId = await enhancedVoiceService.startStreamingSTT(userId, {
      language,
      enableVoiceAuth,
      streamingMode: true
    });

    res.json({
      success: true,
      streamId,
      language
    });

  } catch (error) {
    console.error('Streaming STT start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start voice streaming'
    });
  }
});

/**
 * POST /api/ai/voice/streaming/chunk - Process streaming audio chunk
 */
router.post('/voice/streaming/chunk', requireAuth, upload.single('audioChunk'), async (req, res) => {
  try {
    const { streamId } = req.body;

    if (!streamId || !req.file) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID and audio chunk are required'
      });
    }

    const result = await enhancedVoiceService.processStreamingChunk(streamId, req.file.buffer);
    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Streaming chunk processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process audio chunk'
    });
  }
});

/**
 * POST /api/ai/voice/streaming/stop - Stop streaming STT session
 */
router.post('/voice/streaming/stop', requireAuth, async (req, res) => {
  try {
    const { streamId } = req.body;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID is required'
      });
    }

    const result = await enhancedVoiceService.stopStreamingSTT(streamId);
    res.json(result);

  } catch (error) {
    console.error('Streaming STT stop error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop voice streaming'
    });
  }
});

/**
 * POST /api/ai/document/process - Enhanced document processing with OCR
 */
router.post('/document/process', requireAuth, upload.single('document'), async (req, res) => {
  try {
    const { documentType, language = 'en', enableAutofill = true } = req.body;
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Document file is required'
      });
    }

    // Save file temporarily for OCR processing
    const fs = await import('fs/promises');
    const path = await import('path');
    const tempPath = path.join('/tmp', `ocr-${Date.now()}-${req.file.originalname}`);
    await fs.writeFile(tempPath, req.file.buffer);

    // Process document with enhanced OCR
    const ocrResult = await enhancedSAOCR.processDocument(tempPath, req.file.mimetype, {
      documentType,
      enablePreprocessing: true,
      enableMultiLanguage: language !== 'en',
      extractFields: true,
      validateExtractedData: true,
      enhanceImageQuality: true
    });

    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {});

    // Generate form autofill suggestions if enabled
    let formAutofill;
    if (enableAutofill && ocrResult.success) {
      // Convert extracted fields to a string description for the form response
      const fieldsDescription = JSON.stringify(ocrResult.extractedFields.map(field => ({
        name: field.name,
        value: field.value,
        confidence: field.confidence
      })));

      // Use generateFormResponse instead of generateFormAutofill
      const formResponse = await aiAssistant.generateFormResponse(
        documentType,
        fieldsDescription,
        { extractedFields: ocrResult.extractedFields }
      );
      formAutofill = formResponse.success ? {
        extractedFields: formResponse.filledFields || {},
        confidence: 0.8,
        suggestions: []
      } : undefined;
    }

    // Generate contextual help inline
    const contextualHelp = {
      relevantDocuments: ['ID Document', 'Passport', 'Birth Certificate'],
      processingSteps: ['Document Upload', 'Verification', 'Processing', 'Approval'],
      estimatedTime: '3-5 business days',
      requiredDocuments: ['Valid ID', 'Proof of Address', 'Application Form']
    };

    res.json({
      success: ocrResult.success,
      documentAnalysis: ocrResult,
      formAutofill,
      contextualHelp,
      processingTime: ocrResult.processingTime
    });

  } catch (error) {
    console.error('Document processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Document processing failed'
    });
  }
});

/**
 * POST /api/ai/passport/extract - Extract data from passport/visa images for auto-fill
 */
router.post('/passport/extract', requireAuth, upload.single('passportImage'), async (req, res) => {
  try {
    const { targetFormType = 'passport_application', enableAutoFill = true } = req.body;
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Passport image is required'
      });
    }

    // Save file temporarily for OCR processing
    const fs = await import('fs/promises');
    const path = await import('path');
    const tempPath = path.join('/tmp', `passport-${Date.now()}-${req.file.originalname}`);
    await fs.writeFile(tempPath, req.file.buffer);

    // Initialize services
    const aiocrService = new AIOCRIntegrationService();

    // Process passport with comprehensive OCR and AI analysis
    const result = await aiocrService.processDocumentForAI({
      file: {
        ...req.file,
        path: tempPath,
        filename: req.file.originalname,
      } as Express.Multer.File,
      documentType: 'passport',
      userId,
      targetFormType,
      enableAutoFill
    });

    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {});

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Passport processing failed'
      });
    }

    // Extract key passport fields for PDF generation
    const passportData: any = {
      // Personal Information
      fullName: result.extractedFields.full_name?.value || '',
      surname: result.extractedFields.surname?.value || '',
      givenNames: result.extractedFields.given_names?.value || '',
      dateOfBirth: result.extractedFields.date_of_birth?.value || '',
      placeOfBirth: result.extractedFields.place_of_birth?.value || '',
      nationality: result.extractedFields.nationality?.value || '',
      sex: result.extractedFields.sex?.value || 'M',

      // Document Information
      passportNumber: result.extractedFields.passport_number?.value || '',
      controlNumber: result.extractedFields.control_number?.value || '',
      referenceNumber: result.extractedFields.reference_number?.value || '',
      documentNumber: result.extractedFields.document_number?.value || '',

      // Validity Dates
      dateOfIssue: result.extractedFields.date_of_issue?.value || '',
      dateOfExpiry: result.extractedFields.date_of_expiry?.value || '',
      validFrom: result.extractedFields.valid_from?.value || '',
      validUntil: result.extractedFields.valid_until?.value || '',

      // Additional Information
      issuingAuthority: result.extractedFields.issuing_authority?.value || 'DHA',
      portOfEntry: result.extractedFields.port_of_entry?.value || '',

      // MRZ Data if available
      mrzLine1: result.mrzData?.mrzLines?.[0] || '',
      mrzLine2: result.mrzData?.mrzLines?.[1] || '',

      // AI Analysis
      documentAuthenticity: result.aiAnalysis.documentAuthenticity,
      confidenceScore: result.confidence,
      qualityScore: result.ocrResults.confidence
    };

    // For work visas/permits, extract additional fields
    if (result.ocrResults.documentType === 'work_permit') {
      passportData.employerName = result.extractedFields.employer_name?.value || '';
      passportData.jobTitle = result.extractedFields.job_title?.value || '';
      passportData.workLocation = result.extractedFields.work_location?.value || '';
      passportData.permitType = result.extractedFields.permit_type?.value || '';
    }

    // Generate form auto-fill data if requested
    let autoFillData = {};
    if (enableAutoFill) {
      autoFillData = {
        // Form field mapping for document generation page
        childFullName: passportData.fullName,
        fullName: passportData.fullName,
        surname: passportData.surname,
        givenNames: passportData.givenNames,
        dateOfBirth: passportData.dateOfBirth,
        placeOfBirth: passportData.placeOfBirth,
        nationality: passportData.nationality,
        sex: passportData.sex,
        passportNumber: passportData.passportNumber,
        documentNumber: passportData.documentNumber,
        expiryDate: passportData.dateOfExpiry,
        height: result.extractedFields.height?.value || '',
        eyeColor: result.extractedFields.eye_color?.value || '',

        // Work permit specific fields
        employeeFullName: passportData.fullName,
        employeeNationality: passportData.nationality,
        employeePassportNumber: passportData.passportNumber,
        employerName: passportData.employerName,
        jobTitle: passportData.jobTitle,
        workLocation: passportData.workLocation,
        validFrom: passportData.validFrom,
        validUntil: passportData.validUntil,

        // Visa specific fields
        holderFullName: passportData.fullName,
        holderNationality: passportData.nationality,
        holderPassportNumber: passportData.passportNumber,
        countryOfIssue: 'South Africa',
        portOfEntry: passportData.portOfEntry,

        // ID card fields
        address: result.extractedFields.address?.value || '',
        idNumber: result.extractedFields.id_number?.value || ''
      };
    }

    res.json({
      success: true,
      sessionId: result.sessionId,
      documentId: result.documentId,
      extractedData: passportData,
      autoFillData,
      ocrConfidence: result.confidence,
      aiAnalysis: result.aiAnalysis,
      suggestions: result.aiAnalysis.suggestions,
      validationIssues: result.aiAnalysis.issues,
      processingTime: result.processingTime
    });

  } catch (error) {
    console.error('Passport OCR extraction error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Passport extraction failed'
    });
  }
});

/**
 * POST /api/ai/validate - Real-time form validation
 */
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { documentType, fieldName, fieldValue, formData } = req.body;
    const userId = (req as any).user.id;

    if (!documentType || !fieldName || fieldValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Document type, field name, and field value are required'
      });
    }

    const validationResult = await realTimeValidationService.validateRealTime({
      userId,
      documentType,
      fieldName,
      fieldValue,
      formData: formData || {},
      validationType: 'field'
    });

    res.json(validationResult);

  } catch (error) {
    console.error('Real-time validation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation service error'
    });
  }
});

/**
 * GET /api/ai/languages - Get supported languages with capabilities
 */
router.get('/languages', (req, res) => {
  try {
    const voiceLanguages = enhancedVoiceService.getSupportedLanguages();
    // Get supported languages from the service
    const supportedLanguages = [
      { code: 'en', name: 'English', nativeName: 'English', tts: true, stt: true, active: true },
      { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', tts: true, stt: true, active: true },
      { code: 'zu', name: 'isiZulu', nativeName: 'isiZulu', tts: true, stt: true, active: true },
      { code: 'xh', name: 'isiXhosa', nativeName: 'isiXhosa', tts: true, stt: true, active: true },
      { code: 'st', name: 'Sesotho', nativeName: 'Sesotho', tts: true, stt: true, active: true },
      { code: 'tn', name: 'Setswana', nativeName: 'Setswana', tts: true, stt: true, active: true },
      { code: 've', name: 'Tshivenda', nativeName: 'Tshivenda', tts: false, stt: true, active: true },
      { code: 'ts', name: 'Xitsonga', nativeName: 'Xitsonga', tts: false, stt: true, active: true },
      { code: 'ss', name: 'siSwati', nativeName: 'siSwati', tts: false, stt: true, active: true },
      { code: 'nr', name: 'isiNdebele', nativeName: 'isiNdebele', tts: false, stt: false, active: false },
      { code: 'nso', name: 'Sepedi', nativeName: 'Sepedi (Northern Sotho)', tts: false, stt: true, active: true }
    ];

    // Combine language information
    const languages = supportedLanguages.map(lang => {
      const voiceLang = voiceLanguages.find((v: any) => v.code === lang.code);
      return {
        ...lang,
        voice: voiceLang?.capabilities || { speechToText: false, textToSpeech: false, voiceAuth: false }
      };
    });

    res.json({
      success: true,
      languages,
      totalCount: languages.length
    });

  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get language information'
    });
  }
});

/**
 * POST /api/ai/voice/enroll - Enroll user voice for authentication
 */
router.post('/voice/enroll', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const userId = (req as any).user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required for voice enrollment'
      });
    }

    const result = await enhancedVoiceService.enrollVoice(userId, req.file.buffer);

    // Log enrollment attempt
    await storage.createSecurityEvent({
      userId,
      eventType: 'voice_enrollment_attempt',
      severity: 'medium',
      details: {
        success: result.success,
        audioSize: req.file.size
      }
    });

    res.json(result);

  } catch (error) {
    console.error('Voice enrollment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Voice enrollment failed'
    });
  }
});

/**
 * GET /api/ai/stats - Get AI assistant statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const voiceStats = enhancedVoiceService.getSupportedLanguages();
    const validationStats = realTimeValidationService.getValidationStats();

    res.json({
      success: true,
      stats: {
        supportedLanguages: voiceStats.length,
        activeLanguages: voiceStats.filter(l => l.capabilities.speechToText || l.capabilities.textToSpeech).length,
        validation: validationStats,
        voice: {
          sttSupported: voiceStats.filter(l => l.capabilities.speechToText).length,
          ttsSupported: voiceStats.filter(l => l.capabilities.textToSpeech).length,
          voiceAuthSupported: voiceStats.filter(l => l.capabilities.voiceAuth).length
        }
      }
    });

  } catch (error) {
    console.error('AI stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI statistics'
    });
  }
});

export default router;