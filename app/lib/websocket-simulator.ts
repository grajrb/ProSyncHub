'use client';

import { mockAssets, mockSensorReadings } from './mock-data';

export type WebSocketMessage = {
  type: 'SENSOR_UPDATE' | 'ASSET_STATUS' | 'ALERT' | 'WORK_ORDER_UPDATE';
  timestamp: string;
  data: any;
};

export class WebSocketSimulator {
  private callbacks: ((message: WebSocketMessage) => void)[] = [];
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    console.log('WebSocket simulator initialized');
  }

  connect() {
    if (this.isRunning) return;
    
    console.log('WebSocket simulator connecting...');
    this.isRunning = true;
    
    // Simulate connection established
    setTimeout(() => {
      console.log('WebSocket simulator connected');
      this.startSimulation();
    }, 1000);
  }

  disconnect() {
    console.log('WebSocket simulator disconnecting...');
    this.isRunning = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void) {
    this.callbacks.push(callback);
  }

  private startSimulation() {
    if (!this.isRunning) return;

    this.interval = setInterval(() => {
      this.generateRandomMessage();
    }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds
  }

  private generateRandomMessage() {
    const messageTypes = ['SENSOR_UPDATE', 'ASSET_STATUS', 'ALERT'] as const;
    const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    
    let message: WebSocketMessage;
    
    switch (type) {
      case 'SENSOR_UPDATE':
        message = this.generateSensorUpdate();
        break;
      case 'ASSET_STATUS':
        message = this.generateAssetStatusUpdate();
        break;
      case 'ALERT':
        message = this.generateAlert();
        break;
      default:
        return;
    }
    
    console.log('WebSocket simulator sending message:', message);
    this.callbacks.forEach(callback => callback(message));
  }

  private generateSensorUpdate(): WebSocketMessage {
    const asset = mockAssets[Math.floor(Math.random() * mockAssets.length)];
    const sensorTypes = ['temperature', 'vibration', 'pressure', 'current'];
    const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
    
    let value: number;
    let unit: string;
    
    switch (sensorType) {
      case 'temperature':
        value = 60 + Math.random() * 30; // 60-90°C
        unit = '°C';
        break;
      case 'vibration':
        value = 1 + Math.random() * 5; // 1-6 mm/s
        unit = 'mm/s';
        break;
      case 'pressure':
        value = 5 + Math.random() * 10; // 5-15 bar
        unit = 'bar';
        break;
      case 'current':
        value = 10 + Math.random() * 20; // 10-30 A
        unit = 'A';
        break;
      default:
        value = Math.random() * 100;
        unit = '';
    }
    
    return {
      type: 'SENSOR_UPDATE',
      timestamp: new Date().toISOString(),
      data: {
        asset_id: asset.asset_id,
        asset_tag: asset.asset_tag,
        sensor_type: sensorType,
        value: Math.round(value * 10) / 10,
        unit,
        raw_data: {
          calibration_offset: Math.random() * 0.1,
          sensor_health: 95 + Math.random() * 5
        }
      }
    };
  }

  private generateAssetStatusUpdate(): WebSocketMessage {
    const asset = mockAssets[Math.floor(Math.random() * mockAssets.length)];
    const possibleStatuses = ['ONLINE', 'WARNING', 'ERROR', 'MAINTENANCE'];
    
    // Bias towards keeping current status or minor changes
    let newStatus = asset.current_status;
    if (Math.random() < 0.1) { // 10% chance of status change
      newStatus = possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)] as any;
    }
    
    return {
      type: 'ASSET_STATUS',
      timestamp: new Date().toISOString(),
      data: {
        asset_id: asset.asset_id,
        asset_tag: asset.asset_tag,
        previous_status: asset.current_status,
        current_status: newStatus,
        health_score: Math.max(30, Math.min(100, asset.health_score + (Math.random() - 0.5) * 10)),
        last_maintenance: asset.updated_at
      }
    };
  }

  private generateAlert(): WebSocketMessage {
    const asset = mockAssets[Math.floor(Math.random() * mockAssets.length)];
    const alertTypes = ['HIGH_TEMPERATURE', 'EXCESSIVE_VIBRATION', 'LOW_PRESSURE', 'COMMUNICATION_LOSS'];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    const alertMessages = {
      HIGH_TEMPERATURE: `Temperature sensor reading ${(70 + Math.random() * 20).toFixed(1)}°C - exceeds normal range`,
      EXCESSIVE_VIBRATION: `Vibration levels at ${(4 + Math.random() * 3).toFixed(1)}mm/s - potential bearing issue`,
      LOW_PRESSURE: `System pressure dropped to ${(3 + Math.random() * 2).toFixed(1)}bar - check for leaks`,
      COMMUNICATION_LOSS: 'Lost communication with sensor network - check network connectivity'
    };
    
    return {
      type: 'ALERT',
      timestamp: new Date().toISOString(),
      data: {
        alert_id: `ALT-${Date.now()}`,
        asset_id: asset.asset_id,
        asset_tag: asset.asset_tag,
        asset_name: asset.name,
        alert_type: alertType,
        severity,
        message: alertMessages[alertType as keyof typeof alertMessages],
        requires_action: severity === 'HIGH' || severity === 'CRITICAL',
        auto_work_order: false,
        location: asset.location.location_name
      }
    };
  }
}

// Create singleton instance
export const wsSimulator = new WebSocketSimulator();