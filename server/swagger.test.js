const fs = require('fs');
const path = require('path');

// Load the swaggerDef.ts file as a string
const swaggerDefPath = path.join(__dirname, 'swaggerDef.ts');
const swaggerDefContent = fs.readFileSync(swaggerDefPath, 'utf8');

// Extract the swaggerDefinition object from the file content
// This is a simple parser and may not work for all cases
const extractObject = (content) => {
  // Find the start of the swaggerDefinition object
  const startIndex = content.indexOf('export const swaggerDefinition = {');
  if (startIndex === -1) {
    throw new Error('Could not find swaggerDefinition in the file');
  }

  // Track braces to find the end of the object
  let braceCount = 0;
  let i = startIndex;
  let inString = false;
  let stringChar = '';

  // Find the position of the first opening brace
  while (i < content.length && content[i] !== '{') {
    i++;
  }

  // Now count braces to find the end of the object
  while (i < content.length) {
    const char = content[i];
    
    // Handle string literals to avoid counting braces inside strings
    if ((char === '"' || char === "'") && (i === 0 || content[i-1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    // Count braces if not inside a string
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          // We've found the end of the object
          break;
        }
      }
    }
    i++;
  }

  // Extract the object definition as a string
  const objectString = content.substring(startIndex, i + 1);
  
  // Convert to a JavaScript object
  // Note: This is a simplified approach and has limitations
  // We're removing the export statement to make it valid JS
  const jsString = objectString.replace('export const swaggerDefinition = ', 'module.exports = ');
  
  // Create a temporary file to evaluate
  const tempFilePath = path.join(__dirname, 'temp-swagger-def.js');
  fs.writeFileSync(tempFilePath, jsString);
  
  // Require the temporary file to get the object
  const swaggerDef = require('./temp-swagger-def.js');
  
  // Clean up
  fs.unlinkSync(tempFilePath);
  
  return swaggerDef;
};

try {
  // Get the swagger definition
  const swaggerDefinition = extractObject(swaggerDefContent);

  // Test if the Swagger definition has all required fields
  const { info, openapi, servers, paths, components } = swaggerDefinition;

  // Test the basic structure
  console.log('OpenAPI Version:', openapi);
  console.log('API Title:', info.title);
  console.log('API Version:', info.version);

  // Check servers
  console.log('\nServers:');
  servers.forEach((server, index) => {
    console.log(`  ${index + 1}. ${server.url} (${server.description})`);
  });

  // Check security schemes
  console.log('\nSecurity Schemes:');
  for (const [name, scheme] of Object.entries(components.securitySchemes)) {
    console.log(`  ${name}: ${scheme.type}, ${scheme.scheme}`);
  }

  // Check defined schemas
  console.log('\nDefined Schemas:');
  const schemaNames = Object.keys(components.schemas);
  console.log(`  Total schemas: ${schemaNames.length}`);
  console.log('  Schemas: ' + schemaNames.join(', '));

  // Check paths
  console.log('\nAPI Paths:');
  const apiPaths = Object.keys(paths);
  console.log(`  Total paths: ${apiPaths.length}`);
  
  if (apiPaths.length > 0) {
    console.log('  Sample paths:');
    // Display at most 10 paths as a sample
    const samplePaths = apiPaths.slice(0, 10);
    samplePaths.forEach(path => {
      const methods = Object.keys(paths[path]);
      console.log(`    ${path}`);
      methods.forEach(method => {
        console.log(`      ${method.toUpperCase()}: ${paths[path][method].summary}`);
      });
    });
    
    if (apiPaths.length > 10) {
      console.log(`    ... and ${apiPaths.length - 10} more paths`);
    }
  } else {
    console.log('  No paths defined');
  }

  console.log('\nSwagger validation complete. If you see this message, the basic structure is valid.');
} catch (error) {
  console.error('Error validating Swagger definition:', error);
}
