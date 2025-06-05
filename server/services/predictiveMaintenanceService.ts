/**
 * Predictive Maintenance Service for ProSyncHub
 * Provides analytics and failure prediction based on sensor data
 */

import AssetSensorData from '../models/AssetSensorData';
import { setCache, getCache } from '../redis';
import { sensorDataService } from './sensorDataService';

// Cache TTL for predictions (in seconds)
const PREDICTION_CACHE_TTL = 3600; // 1 hour

// Different prediction models
type PredictionModel = 'linear' | 'exponential' | 'moving-average' | 'threshold';

interface MaintenancePrediction {
  assetId: string;
  sensorId: string;
  predictionType: string;
  currentValue: number;
  thresholdValue: number;
  predictedFailureTime: Date | null;
  confidence: number;
  remainingUsefulLife: number | null; // in hours
  recommendations: string[];
  lastUpdated: Date;
}

interface AnalyticsParams {
  assetId: string;
  sensorTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  interval?: 'hour' | 'day' | 'week' | 'month';
  aggregation?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  status?: string;
}

interface AnalyticsResult {
  assetId: string;
  sensorType: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  interval: string;
  aggregation: string;
  dataPoints: TimeSeriesDataPoint[];
  summary: {
    min: number;
    max: number;
    avg: number;
    total?: number;
    count: number;
    abnormalCount: number;
    trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  };
}

export const predictiveMaintenanceService = {
  /**
   * Generate predictive maintenance forecasts for an asset
   * @param assetId The asset ID to analyze
   * @param sensorId Optional specific sensor to analyze
   * @param predictionModel The prediction model to use
   * @returns Maintenance prediction data
   */
  async generatePrediction(
    assetId: string,
    sensorId?: string,
    predictionModel: PredictionModel = 'linear'
  ): Promise<MaintenancePrediction[]> {
    try {
      // Try to get from cache first if we have a specific sensor
      if (sensorId) {
        const cacheKey = `prediction:${assetId}:${sensorId}:${predictionModel}`;
        const cachedPrediction = await getCache<MaintenancePrediction>(cacheKey);
        if (cachedPrediction) {
          return [cachedPrediction];
        }
      }

      // Define query to get sensor data
      const query: any = { assetId };
      if (sensorId) {
        query.sensorId = sensorId;
      }

      // Get all sensors for this asset if no specific sensor is provided
      const sensorData = await AssetSensorData.find(query)
        .sort({ timestamp: -1 })
        .limit(sensorId ? 1000 : 100); // Limit data points per sensor

      if (sensorData.length === 0) {
        return [];
      }

      // Group by sensor ID if we're analyzing multiple sensors
      const sensorGroups = sensorData.reduce<Record<string, any[]>>((groups, reading) => {
        const id = reading.sensorId;
        if (!groups[id]) {
          groups[id] = [];
        }
        groups[id].push(reading);
        return groups;
      }, {});

      // Generate predictions for each sensor
      const predictions: MaintenancePrediction[] = [];

      for (const [id, readings] of Object.entries(sensorGroups)) {
        if (readings.length < 10) {
          continue; // Skip sensors with insufficient data
        }

        // Get sensor stats
        const stats = await sensorDataService.getSensorStats(assetId, id);
        if (!stats) {
          continue;
        }

        // Choose prediction strategy based on model type and sensor data
        let prediction: MaintenancePrediction;
        
        switch (predictionModel) {
          case 'linear':
            prediction = this.linearRegressionPredictor(assetId, id, readings, stats);
            break;
          case 'exponential':
            prediction = this.exponentialTrendPredictor(assetId, id, readings, stats);
            break;
          case 'moving-average':
            prediction = this.movingAveragePredictor(assetId, id, readings, stats);
            break;
          case 'threshold':
          default:
            prediction = this.thresholdBasedPredictor(assetId, id, readings, stats);
            break;
        }

        // Cache the prediction
        const cacheKey = `prediction:${assetId}:${id}:${predictionModel}`;
        await setCache(cacheKey, JSON.stringify(prediction), PREDICTION_CACHE_TTL);
        
        predictions.push(prediction);
      }

      return predictions;
    } catch (error) {
      console.error('Error generating maintenance prediction:', error);
      throw error;
    }
  },

  /**
   * Linear regression prediction model
   * Predicts failure based on linear trend of sensor values
   */
  linearRegressionPredictor(
    assetId: string,
    sensorId: string,
    readings: any[],
    stats: any
  ): MaintenancePrediction {
    // Sort readings by timestamp
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Prepare data for linear regression
    const xValues: number[] = sortedReadings.map((_, i) => i);
    const yValues: number[] = sortedReadings.map(r => r.value);
    
    // Simple linear regression
    const n = xValues.length;
    const sum_x = xValues.reduce((a, b) => a + b, 0);
    const sum_y = yValues.reduce((a, b) => a + b, 0);
    const sum_xy = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
    const sum_xx = xValues.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    const intercept = (sum_y - slope * sum_x) / n;
    
    // Determine if there's a significant trend
    const latestValue = sortedReadings[sortedReadings.length - 1].value;
    const normalMax = stats.avg + 1.5 * stats.stdDev;
    const criticalThreshold = stats.avg + 2.5 * stats.stdDev;
    
    // Predict time to reach critical threshold if trend is upward
    let predictedFailureTime: Date | null = null;
    let remainingUsefulLife: number | null = null;
    let recommendations: string[] = [];
    
    if (slope > 0 && latestValue < criticalThreshold) {
      // Estimate time to reach critical threshold
      const timeStepsToFailure = (criticalThreshold - latestValue) / slope;
      const latestTimestamp = new Date(sortedReadings[sortedReadings.length - 1].timestamp);
      
      // Estimate one time step in milliseconds
      const timeStep = sortedReadings.length > 1 
        ? (new Date(sortedReadings[sortedReadings.length - 1].timestamp).getTime() - 
           new Date(sortedReadings[0].timestamp).getTime()) / (sortedReadings.length - 1)
        : 3600000; // default to 1 hour
      
      predictedFailureTime = new Date(latestTimestamp.getTime() + timeStepsToFailure * timeStep);
      remainingUsefulLife = timeStepsToFailure * timeStep / (3600 * 1000); // Convert to hours
      
      recommendations = [
        `Schedule maintenance before ${predictedFailureTime.toLocaleDateString()}`,
        'Inspect for signs of wear or damage',
        'Consider replacement if wear is significant'
      ];
    } else if (slope <= 0) {
      recommendations = [
        'No immediate maintenance action required',
        'Continue regular monitoring'
      ];
    } else {
      recommendations = [
        'Immediate inspection required',
        'Schedule maintenance as soon as possible',
        'Monitor closely for further degradation'
      ];
    }
    
    return {
      assetId,
      sensorId,
      predictionType: 'linear-regression',
      currentValue: latestValue,
      thresholdValue: criticalThreshold,
      predictedFailureTime,
      confidence: Math.min(0.9, Math.max(0.1, 1 - (stats.stdDev / stats.avg))),
      remainingUsefulLife,
      recommendations,
      lastUpdated: new Date()
    };
  },

  /**
   * Exponential trend prediction model
   * Useful for detecting accelerating failures
   */
  exponentialTrendPredictor(
    assetId: string,
    sensorId: string,
    readings: any[],
    stats: any
  ): MaintenancePrediction {
    // Implementation would use exponential regression
    // For this example, we'll provide a simplified version
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Get the last few readings to detect acceleration
    const recentReadings = sortedReadings.slice(-10);
    const latestValue = recentReadings[recentReadings.length - 1].value;
    const criticalThreshold = stats.avg + 2.5 * stats.stdDev;
    
    // Check if values are accelerating upward
    let isAccelerating = true;
    let acceleration = 0;
    
    for (let i = 2; i < recentReadings.length; i++) {
      const prev_diff = recentReadings[i-1].value - recentReadings[i-2].value;
      const curr_diff = recentReadings[i].value - recentReadings[i-1].value;
      
      if (curr_diff <= prev_diff) {
        isAccelerating = false;
        break;
      }
      
      acceleration += (curr_diff - prev_diff);
    }
    
    acceleration = acceleration / (recentReadings.length - 2);
    
    // Predict failure
    let predictedFailureTime: Date | null = null;
    let remainingUsefulLife: number | null = null;
    let recommendations: string[] = [];
    
    if (isAccelerating && acceleration > 0 && latestValue < criticalThreshold) {
      // Exponential growth model: value = a * e^(b*t)
      // For simplicity, estimate using the acceleration
      const timeToFailure = (criticalThreshold - latestValue) / acceleration;
      const latestTimestamp = new Date(recentReadings[recentReadings.length - 1].timestamp);
      
      // Estimate time between readings
      const avgTimeStep = recentReadings.length > 1 
        ? (new Date(recentReadings[recentReadings.length - 1].timestamp).getTime() - 
           new Date(recentReadings[0].timestamp).getTime()) / (recentReadings.length - 1)
        : 3600000;
      
      predictedFailureTime = new Date(latestTimestamp.getTime() + timeToFailure * avgTimeStep);
      remainingUsefulLife = timeToFailure * avgTimeStep / (3600 * 1000); // Convert to hours
      
      recommendations = [
        `Urgent: Accelerating degradation detected`,
        `Schedule maintenance within ${Math.ceil(remainingUsefulLife / 24)} days`,
        'Prepare replacement parts'
      ];
    } else {
      recommendations = [
        'No exponential degradation detected',
        'Continue regular monitoring'
      ];
    }
    
    return {
      assetId,
      sensorId,
      predictionType: 'exponential-trend',
      currentValue: latestValue,
      thresholdValue: criticalThreshold,
      predictedFailureTime,
      confidence: isAccelerating ? 0.8 : 0.4,
      remainingUsefulLife,
      recommendations,
      lastUpdated: new Date()
    };
  },

  /**
   * Moving average prediction model
   * Useful for noisy data with seasonal patterns
   */
  movingAveragePredictor(
    assetId: string,
    sensorId: string,
    readings: any[],
    stats: any
  ): MaintenancePrediction {
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Calculate moving averages
    const windowSize = Math.min(10, Math.floor(sortedReadings.length / 3));
    const movingAvgs: number[] = [];
    
    for (let i = windowSize - 1; i < sortedReadings.length; i++) {
      const windowSum = sortedReadings
        .slice(i - windowSize + 1, i + 1)
        .reduce((sum, reading) => sum + reading.value, 0);
      movingAvgs.push(windowSum / windowSize);
    }
    
    // Check if moving average is trending toward threshold
    const latestMA = movingAvgs[movingAvgs.length - 1];
    const criticalThreshold = stats.avg + 2 * stats.stdDev;
    
    // Calculate trend in moving average
    const maSlope = movingAvgs.length > 5 
      ? (movingAvgs[movingAvgs.length - 1] - movingAvgs[movingAvgs.length - 6]) / 5
      : 0;
    
    let predictedFailureTime: Date | null = null;
    let remainingUsefulLife: number | null = null;
    let recommendations: string[] = [];
    
    if (maSlope > 0 && latestMA < criticalThreshold) {
      // Estimate time to threshold
      const timeToThreshold = (criticalThreshold - latestMA) / maSlope;
      const latestTimestamp = new Date(sortedReadings[sortedReadings.length - 1].timestamp);
      
      // Average time between readings
      const avgTimeStep = sortedReadings.length > windowSize 
        ? (new Date(sortedReadings[sortedReadings.length - 1].timestamp).getTime() - 
           new Date(sortedReadings[sortedReadings.length - windowSize]).getTime()) / windowSize
        : 3600000;
      
      predictedFailureTime = new Date(latestTimestamp.getTime() + timeToThreshold * avgTimeStep);
      remainingUsefulLife = timeToThreshold * avgTimeStep / (3600 * 1000);
      
      recommendations = [
        `Plan maintenance within ${Math.ceil(remainingUsefulLife / 24)} days`,
        'Monitor trend closely',
        'Inspect during next scheduled maintenance'
      ];
    } else {
      recommendations = [
        'No concerning trend in moving average',
        'Continue regular monitoring'
      ];
    }
    
    return {
      assetId,
      sensorId,
      predictionType: 'moving-average',
      currentValue: sortedReadings[sortedReadings.length - 1].value,
      thresholdValue: criticalThreshold,
      predictedFailureTime,
      confidence: 0.6, // Moving averages are moderately reliable
      remainingUsefulLife,
      recommendations,
      lastUpdated: new Date()
    };
  },

  /**
   * Simple threshold-based prediction
   * Uses current value and rate of change to estimate time to threshold
   */
  thresholdBasedPredictor(
    assetId: string,
    sensorId: string,
    readings: any[],
    stats: any
  ): MaintenancePrediction {
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Get recent readings
    const recentReadings = sortedReadings.slice(-20);
    const latestValue = recentReadings[recentReadings.length - 1].value;
    
    // Determine thresholds based on historical data
    const warningThreshold = stats.avg + 1.5 * stats.stdDev;
    const criticalThreshold = stats.avg + 2.5 * stats.stdDev;
    
    // Calculate rate of change
    const rateOfChange = recentReadings.length > 1
      ? (recentReadings[recentReadings.length - 1].value - recentReadings[0].value) / 
        (recentReadings.length - 1)
      : 0;
    
    let predictedFailureTime: Date | null = null;
    let remainingUsefulLife: number | null = null;
    let recommendations: string[] = [];
    let confidence = 0.5;
    
    if (latestValue >= criticalThreshold) {
      // Already at critical level
      recommendations = [
        'CRITICAL: Immediate maintenance required',
        'Schedule emergency service',
        'Prepare for possible replacement'
      ];
      confidence = 0.9;
    } else if (latestValue >= warningThreshold) {
      // At warning level
      recommendations = [
        'WARNING: Asset approaching critical threshold',
        'Schedule maintenance soon',
        'Increase monitoring frequency'
      ];
      confidence = 0.7;
      
      if (rateOfChange > 0) {
        const timeToThreshold = (criticalThreshold - latestValue) / rateOfChange;
        const latestTimestamp = new Date(recentReadings[recentReadings.length - 1].timestamp);
        const avgTimeStep = recentReadings.length > 1 
          ? (new Date(recentReadings[recentReadings.length - 1].timestamp).getTime() - 
             new Date(recentReadings[0].timestamp).getTime()) / (recentReadings.length - 1)
          : 3600000;
        
        predictedFailureTime = new Date(latestTimestamp.getTime() + timeToThreshold * avgTimeStep);
        remainingUsefulLife = timeToThreshold * avgTimeStep / (3600 * 1000);
      }
    } else if (rateOfChange > 0) {
      // Below thresholds but trending upward
      const timeToWarning = (warningThreshold - latestValue) / rateOfChange;
      const latestTimestamp = new Date(recentReadings[recentReadings.length - 1].timestamp);
      const avgTimeStep = recentReadings.length > 1 
        ? (new Date(recentReadings[recentReadings.length - 1].timestamp).getTime() - 
           new Date(recentReadings[0].timestamp).getTime()) / (recentReadings.length - 1)
        : 3600000;
      
      predictedFailureTime = new Date(latestTimestamp.getTime() + 
        ((criticalThreshold - latestValue) / rateOfChange) * avgTimeStep);
      remainingUsefulLife = ((criticalThreshold - latestValue) / rateOfChange) * avgTimeStep / (3600 * 1000);
      
      recommendations = [
        `Plan preventive maintenance within ${Math.ceil(timeToWarning * avgTimeStep / (24 * 3600 * 1000))} days`,
        'Check for early signs of wear',
        'Review historical maintenance records'
      ];
      confidence = 0.6;
    } else {
      // Stable or improving
      recommendations = [
        'Asset operating within normal parameters',
        'Follow standard maintenance schedule',
        'No immediate action required'
      ];
      confidence = 0.8;
    }
    
    return {
      assetId,
      sensorId,
      predictionType: 'threshold-based',
      currentValue: latestValue,
      thresholdValue: criticalThreshold,
      predictedFailureTime,
      confidence,
      remainingUsefulLife,
      recommendations,
      lastUpdated: new Date()
    };
  },

  /**
   * Get time-series analytics for sensor data
   * @param params Analytics parameters
   */
  async getTimeSeriesAnalytics(params: AnalyticsParams): Promise<AnalyticsResult[]> {
    try {
      const {
        assetId,
        sensorTypes,
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
        endDate = new Date(),
        interval = 'day',
        aggregation = 'avg'
      } = params;

      // Convert interval to MongoDB date grouping format
      const dateFormat: Record<string, string> = {
        'hour': '%Y-%m-%d-%H',
        'day': '%Y-%m-%d',
        'week': '%Y-W%U',
        'month': '%Y-%m'
      };

      // Build the query
      const query: any = { 
        assetId, 
        timestamp: { $gte: startDate, $lte: endDate }
      };

      if (sensorTypes && sensorTypes.length > 0) {
        query.sensorType = { $in: sensorTypes };
      }

      // Group by sensor type and time interval
      const results = await AssetSensorData.aggregate([
        { $match: query },
        { 
          $group: {
            _id: {
              sensorType: '$sensorType',
              interval: { 
                $dateToString: { 
                  format: dateFormat[interval], 
                  date: '$timestamp' 
                } 
              }
            },
            min: { $min: '$value' },
            max: { $max: '$value' },
            avg: { $avg: '$value' },
            sum: { $sum: '$value' },
            count: { $sum: 1 },
            abnormalCount: {
              $sum: {
                $cond: [
                  { $ne: ['$status', 'normal'] },
                  1,
                  0
                ]
              }
            },
            firstTimestamp: { $min: '$timestamp' },
            lastTimestamp: { $max: '$timestamp' }
          }
        },
        { $sort: { '_id.sensorType': 1, '_id.interval': 1 } }
      ]);

      // Group results by sensor type
      const sensorResults: Record<string, any[]> = {};
      results.forEach(result => {
        const sensorType = result._id.sensorType;
        if (!sensorResults[sensorType]) {
          sensorResults[sensorType] = [];
        }
        sensorResults[sensorType].push(result);
      });

      // Format the final results
      const analytics: AnalyticsResult[] = [];

      for (const [sensorType, dataPoints] of Object.entries(sensorResults)) {
        // Calculate trend
        let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating' = 'stable';
        
        if (dataPoints.length > 1) {
          const firstValue = dataPoints[0][aggregation];
          const lastValue = dataPoints[dataPoints.length - 1][aggregation];
          const diff = lastValue - firstValue;
          const percentChange = Math.abs(diff / firstValue) * 100;
          
          if (percentChange < 5) {
            trend = 'stable';
          } else if (diff > 0) {
            trend = 'increasing';
          } else {
            trend = 'decreasing';
          }
          
          // Check for fluctuation
          let fluctuations = 0;
          for (let i = 1; i < dataPoints.length; i++) {
            if ((dataPoints[i][aggregation] > dataPoints[i-1][aggregation] && 
                (i > 1 && dataPoints[i-1][aggregation] < dataPoints[i-2][aggregation])) ||
               (dataPoints[i][aggregation] < dataPoints[i-1][aggregation] && 
                (i > 1 && dataPoints[i-1][aggregation] > dataPoints[i-2][aggregation]))) {
              fluctuations++;
            }
          }
          
          if (fluctuations > dataPoints.length / 3) {
            trend = 'fluctuating';
          }
        }
        
        // Calculate summary statistics
        const summary = {
          min: Math.min(...dataPoints.map(p => p.min)),
          max: Math.max(...dataPoints.map(p => p.max)),
          avg: dataPoints.reduce((sum, p) => sum + p.avg * p.count, 0) / 
               dataPoints.reduce((sum, p) => sum + p.count, 0),
          total: dataPoints.reduce((sum, p) => sum + p.sum, 0),
          count: dataPoints.reduce((sum, p) => sum + p.count, 0),
          abnormalCount: dataPoints.reduce((sum, p) => sum + p.abnormalCount, 0),
          trend
        };
        
        // Format time series data points
        const formattedDataPoints = dataPoints.map(point => ({
          timestamp: point.firstTimestamp,
          value: point[aggregation],
          status: point.abnormalCount > 0 ? 'abnormal' : 'normal'
        }));
        
        analytics.push({
          assetId,
          sensorType,
          timeRange: {
            start: startDate,
            end: endDate
          },
          interval,
          aggregation,
          dataPoints: formattedDataPoints,
          summary
        });
      }

      return analytics;
    } catch (error) {
      console.error('Error generating time series analytics:', error);
      throw error;
    }
  }
};
