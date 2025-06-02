import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDefPath = path.join(__dirname, 'swaggerDef.ts');

// Read the file content
const fileContent = fs.readFileSync(swaggerDefPath, 'utf8');

// A simple validation function to check various aspects of the Swagger definition
function validateSwaggerDef(content) {
  // Check if all required sections are present
  const checks = [
    { name: 'openapi version', pattern: /openapi: ['"]3\.0\.0['"]/ },
    { name: 'info section', pattern: /info: \{/ },
    { name: 'servers section', pattern: /servers: \[/ },
    { name: 'components section', pattern: /components: \{/ },
    { name: 'paths section', pattern: /paths: \{/ },
    { name: 'Asset schema', pattern: /Asset: \{/ },
    { name: 'WorkOrder schema', pattern: /WorkOrder: \{/ },
    { name: 'MaintenanceSchedule schema', pattern: /MaintenanceSchedule: \{/ },
    { name: 'Notification schema', pattern: /Notification: \{/ },
    { name: 'AssetSensorReading schema', pattern: /AssetSensorReading: \{/ },
    { name: 'User schema', pattern: /User: \{/ },
    { name: 'Error schema', pattern: /Error: \{/ },
    { name: 'Location schema', pattern: /Location: \{/ },
    { name: 'Plant schema', pattern: /Plant: \{/ },
    { name: 'AssetType schema', pattern: /AssetType: \{/ },
    { name: 'Role schema', pattern: /Role: \{/ },
    { name: 'Assets path', pattern: /['"]\/api\/assets['"]/ },
    { name: 'WorkOrders path', pattern: /['"]\/api\/work-orders['"]/ },
    { name: 'MaintenanceSchedules path', pattern: /['"]\/api\/maintenance-schedules['"]/ },
    { name: 'Notifications path', pattern: /['"]\/api\/notifications['"]/ },
    { name: 'AssetSensorReadings path', pattern: /['"]\/api\/asset-sensor-readings['"]/ },
    { name: 'Authentication path', pattern: /['"]\/api\/auth\/login['"]/ },
    { name: 'WebSocket path', pattern: /['"]\/ws['"]/ }
  ];

  const results = checks.map(check => {
    const isPresent = check.pattern.test(content);
    return { ...check, isPresent };
  });

  // Count paths
  const pathMatches = content.match(/['"]\/api\/[^'"]+(\/\{[^}]+\})?['"]: \{/g) || [];
    // Count methods
  const methodCounts = {
    get: (content.match(/get: \{/g) || []).length,
    post: (content.match(/post: \{/g) || []).length,
    put: (content.match(/put: \{/g) || []).length,
    delete: (content.match(/delete: \{/g) || []).length
  };

  return {
    checks: results,
    pathCount: pathMatches.length,
    methodCounts
  };
}

// Validate the Swagger definition
const validation = validateSwaggerDef(fileContent);

// Print validation results
console.log('Swagger Definition Validation Results:');
console.log('=====================================');

// Print checks results
const passed = validation.checks.filter(check => check.isPresent).length;
const failed = validation.checks.filter(check => !check.isPresent).length;
console.log(`Checks: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\nFailed Checks:');
  validation.checks
    .filter(check => !check.isPresent)
    .forEach(check => console.log(`- ${check.name} not found`));
}

console.log('\nAPI Coverage:');
console.log(`- Total API paths: ${validation.pathCount}`);
console.log('- HTTP Methods:');
Object.entries(validation.methodCounts).forEach(([method, count]) => {
  console.log(`  - ${method.toUpperCase()}: ${count}`);
});

// Check that all methods have at least some documentation
console.log('\nSummary:');
if (failed === 0 && validation.pathCount >= 10 && 
    validation.methodCounts.get >= 10 && 
    validation.methodCounts.post >= 5) {
  console.log('✅ The Swagger definition appears to be comprehensive and well-documented.');
  console.log('   It includes schemas for all major entities and documents all main API endpoints.');
} else if (failed <= 3 && validation.pathCount >= 5) {
  console.log('⚠️ The Swagger definition is partially complete but may need additional work.');
  console.log('   Consider adding documentation for more endpoints or missing schemas.');
} else {
  console.log('❌ The Swagger definition needs significant improvement.');
  console.log('   Many required sections or endpoints are missing or incomplete.');
}
