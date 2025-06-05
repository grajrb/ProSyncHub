/**
 * API Client for testing ProSyncHub backend services
 * This script can be used to test the sensor data ingestion and analytics endpoints
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Set this in your environment or modify here

// Axios instance with auth header
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

// Helper to generate random sensor data
function generateSensorData(assetId, sensorId, sensorType, count, startDate = new Date(), interval = 3600000) {
  const readings = [];
  let currentDate = new Date(startDate);
  
  // Mappings for different sensor types
  const sensorRanges = {
    'temperature': { min: 18, max: 32, unit: '°C' },
    'pressure': { min: 95, max: 105, unit: 'kPa' },
    'humidity': { min: 30, max: 80, unit: '%' },
    'vibration': { min: 0.1, max: 5, unit: 'mm/s' },
    'voltage': { min: 110, max: 130, unit: 'V' },
    'current': { min: 0.5, max: 15, unit: 'A' },
    'flow': { min: 5, max: 50, unit: 'L/min' },
    'level': { min: 20, max: 90, unit: '%' }
  };
  
  const range = sensorRanges[sensorType] || { min: 0, max: 100, unit: 'units' };
  
  // Generate readings with some randomness and occasional spikes
  for (let i = 0; i < count; i++) {
    // Occasionally generate an anomaly
    const isAnomaly = Math.random() < 0.05;
    
    let value;
    if (isAnomaly) {
      // Generate a value outside the normal range (high or low)
      const direction = Math.random() > 0.5 ? 1 : -1;
      const anomalyFactor = 1 + (Math.random() * 0.5); // 1.0 to 1.5 multiplier
      
      if (direction > 0) {
        value = range.max * anomalyFactor;
      } else {
        value = range.min / anomalyFactor;
      }
    } else {
      // Generate a normal value within the range
      value = range.min + (Math.random() * (range.max - range.min));
    }
    
    // Apply slight trend for realistic data
    const trendComponent = (i / count) * (range.max - range.min) * 0.2;
    value += trendComponent;
    
    // Round to reasonable precision
    value = Math.round(value * 100) / 100;
    
    // Calculate status based on value
    let status = 'normal';
    if (value > range.max) {
      status = 'critical';
    } else if (value > (range.max - ((range.max - range.min) * 0.1))) {
      status = 'warning';
    } else if (value < range.min) {
      status = 'critical';
    } else if (value < (range.min + ((range.max - range.min) * 0.1))) {
      status = 'warning';
    }
    
    readings.push({
      timestamp: new Date(currentDate),
      value,
      status
    });
    
    // Increment time for next reading
    currentDate = new Date(currentDate.getTime() + interval);
  }
  
  return {
    assetId,
    sensorId,
    sensorType,
    unit: range.unit,
    readings
  };
}

// Test functions
async function testLogin(username, password) {
  try {
    const response = await apiClient.post('/auth/login', {
      username,
      password
    });
    
    console.log('Login successful!');
    console.log('Token:', response.data.token);
    
    // Update the token for subsequent requests
    apiClient.defaults.headers.Authorization = `Bearer ${response.data.token}`;
    
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testSensorDataBatchIngestion(assetId, sensorIds, count = 100) {
  try {
    // Generate data for multiple sensors
    const sensorTypes = ['temperature', 'pressure', 'humidity', 'vibration', 'voltage', 'current', 'flow', 'level'];
    const promises = [];
    
    for (const sensorId of sensorIds) {
      // Pick a sensor type based on the sensorId (simple mapping for test purposes)
      const sensorTypeIndex = sensorId.charCodeAt(sensorId.length - 1) % sensorTypes.length;
      const sensorType = sensorTypes[sensorTypeIndex];
      
      // Generate 24 hours worth of data at 15-minute intervals
      const sensorData = generateSensorData(
        assetId,
        sensorId,
        sensorType,
        count, // number of readings
        new Date(Date.now() - (count * 15 * 60 * 1000)), // start 24 hours ago
        15 * 60 * 1000 // 15-minute intervals
      );
      
      console.log(`Ingesting ${count} readings for sensor ${sensorId} (${sensorType})...`);
      
      promises.push(apiClient.post('/sensors/batch', sensorData));
    }
    
    const results = await Promise.all(promises);
    console.log('Batch ingestion complete!');
    
    results.forEach((response, index) => {
      console.log(`Sensor ${sensorIds[index]}: ${response.data.count} readings ingested`);
    });
    
    return results;
  } catch (error) {
    console.error('Batch ingestion failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetSensorData(assetId, sensorId) {
  try {
    const response = await apiClient.get('/sensors', {
      params: {
        assetId,
        sensorId,
        limit: 10
      }
    });
    
    console.log(`Latest sensor data for ${sensorId}:`);
    console.table(response.data.slice(0, 5));
    
    return response.data;
  } catch (error) {
    console.error('Failed to get sensor data:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetSensorStats(assetId, sensorId) {
  try {
    const response = await apiClient.get('/sensors/stats', {
      params: {
        assetId,
        sensorId
      }
    });
    
    console.log(`Sensor stats for ${sensorId}:`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to get sensor stats:', error.response?.data || error.message);
    throw error;
  }
}

async function testPredictiveMaintenance(assetId, sensorId) {
  try {
    const response = await apiClient.get('/sensors/predictions', {
      params: {
        assetId,
        sensorId,
        model: 'linear'
      }
    });
    
    console.log(`Predictive maintenance for ${sensorId || 'all sensors'}:`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to get predictions:', error.response?.data || error.message);
    throw error;
  }
}

async function testSensorAnalytics(assetId, sensorTypes) {
  try {
    const response = await apiClient.get('/sensors/analytics', {
      params: {
        assetId,
        sensorTypes,
        interval: 'hour',
        aggregation: 'avg'
      }
    });
    
    console.log(`Analytics for ${assetId}:`);
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Failed to get analytics:', error.response?.data || error.message);
    throw error;
  }
}

// Main test function
async function runTests() {
  try {
    // Login first to get a valid token
    await testLogin('admin', 'admin123');
    
    const assetId = 'asset-001';
    const sensorIds = ['sensor-001', 'sensor-002', 'sensor-003', 'sensor-004'];
    
    // Test data ingestion
    await testSensorDataBatchIngestion(assetId, sensorIds, 96); // 96 readings = 24 hours at 15 min intervals
    
    // Test data retrieval
    await testGetSensorData(assetId, sensorIds[0]);
    
    // Test stats
    await testGetSensorStats(assetId, sensorIds[0]);
    
    // Test predictive maintenance
    await testPredictiveMaintenance(assetId, sensorIds[0]);
    
    // Test analytics
    await testSensorAnalytics(assetId, ['temperature', 'pressure']);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  generateSensorData,
  testLogin,
  testSensorDataBatchIngestion,
  testGetSensorData,
  testGetSensorStats,
  testPredictiveMaintenance,
  testSensorAnalytics,
  runTests
};
