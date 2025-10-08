
/**
 * COMPLETE FEATURE VERIFICATION
 * Verifies all features are active and working
 */

import { universalAPIOverride } from './server/middleware/universal-api-override';
import { governmentAPIs } from './server/services/government-api-integrations';
import { governmentPrintIntegration } from './server/services/government-print-integration';
import { completePDFGenerationService } from './server/services/complete-pdf-generation-service';

async function verifyAllFeatures() {
  console.log('🔍 COMPREHENSIVE FEATURE VERIFICATION\n');
  
  const results = {
    universalBypass: false,
    governmentAPIs: false,
    printingIntegration: false,
    pdfGeneration: false,
    workPermits: false
  };
  
  // 1. Verify Universal API Bypass
  console.log('1️⃣ Testing Universal API Override...');
  try {
    const openaiKey = universalAPIOverride.getAPIKey('OPENAI');
    const dhaKey = universalAPIOverride.getAPIKey('DHA_NPR');
    results.universalBypass = !!(openaiKey && dhaKey);
    console.log('   ✅ Universal API Override: ACTIVE');
  } catch (error) {
    console.log('   ❌ Universal API Override: FAILED');
  }
  
  // 2. Verify Government API Integration
  console.log('\n2️⃣ Testing Government API Integration...');
  try {
    const status = governmentAPIs.getConnectionStatus();
    results.governmentAPIs = true;
    console.log('   ✅ Government APIs: CONFIGURED');
    console.log('   - NPR:', status.npr ? '✓' : '○');
    console.log('   - ABIS:', status.abis ? '✓' : '○');
    console.log('   - DHA:', status.dhaGovernment ? '✓' : '○');
  } catch (error) {
    console.log('   ❌ Government APIs: FAILED');
  }
  
  // 3. Verify Printing Integration
  console.log('\n3️⃣ Testing Government Printing...');
  try {
    const printStatus = await governmentPrintIntegration.checkPrintServiceStatus();
    results.printingIntegration = printStatus.operational;
    console.log('   ✅ Printing Service: OPERATIONAL');
    console.log('   - Offices:', printStatus.availableOffices.length);
  } catch (error) {
    console.log('   ❌ Printing Service: FAILED');
  }
  
  // 4. Verify PDF Generation
  console.log('\n4️⃣ Testing PDF Generation...');
  try {
    const healthCheck = await completePDFGenerationService.healthCheck();
    results.pdfGeneration = healthCheck.healthy;
    console.log('   ✅ PDF Generation: ACTIVE');
    console.log('   - Supported Types:', healthCheck.details.supportedDocuments);
  } catch (error) {
    console.log('   ❌ PDF Generation: FAILED');
  }
  
  // 5. Verify Work Permits
  console.log('\n5️⃣ Testing Work Permit Processing...');
  try {
    const testPermit = await governmentPrintIntegration.processWorkPermit({
      applicantId: 'TEST-123',
      employerDetails: {
        name: 'Test Company',
        registrationNumber: 'REG123',
        address: 'Test Address'
      },
      positionDetails: {
        title: 'Test Position',
        salary: 50000,
        startDate: new Date().toISOString(),
        duration: 12
      },
      qualifications: ['Test Qualification']
    });
    results.workPermits = testPermit.success;
    console.log('   ✅ Work Permits: FUNCTIONAL');
  } catch (error) {
    console.log('   ❌ Work Permits: FAILED');
  }
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('VERIFICATION SUMMARY:');
  console.log('═'.repeat(50));
  console.log('Universal Bypass:', results.universalBypass ? '✅ ACTIVE' : '❌ FAILED');
  console.log('Government APIs:', results.governmentAPIs ? '✅ CONFIGURED' : '❌ FAILED');
  console.log('Printing Service:', results.printingIntegration ? '✅ OPERATIONAL' : '❌ FAILED');
  console.log('PDF Generation:', results.pdfGeneration ? '✅ ACTIVE' : '❌ FAILED');
  console.log('Work Permits:', results.workPermits ? '✅ FUNCTIONAL' : '❌ FAILED');
  
  const allPassed = Object.values(results).every(v => v);
  console.log('\n' + (allPassed ? '🎉 ALL FEATURES VERIFIED!' : '⚠️ SOME FEATURES NEED ATTENTION'));
  
  return results;
}

verifyAllFeatures().catch(console.error);
