/**
 * Sensor Data and Analytics Routes for ProSyncHub
 */

import express from 'express';
import { sensorDataService } from '../services';
import { predictiveMaintenanceService } from '../services';
import { authenticateJWT, authorizeRoles } from '../authMiddleware';
import { requirePermission } from '../rbac';
import { AuthRequest } from '../authMiddleware';

const router = express.Router();

/**
 * @swagger
 * /api/sensors:
 *   get:
 *     summary: Get sensor data with filtering options
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Asset ID to filter by
 *       - in: query
 *         name: sensorId
 *         schema:
 *           type: string
 *         description: Sensor ID to filter by
 *       - in: query
 *         name: sensorType
 *         schema:
 *           type: string
 *         description: Sensor type to filter by
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [normal, warning, critical]
 *         description: Status to filter by
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO format)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of records to return
 *     responses:
 *       200:
 *         description: List of sensor data readings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AssetSensorData'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', requirePermission('sensor', 'read'), async (req, res, next) => {
  try {
    // Use (req as AuthRequest) when accessing req.user
    const { assetId, sensorId, sensorType, status, startDate, endDate, limit = 100 } = req.query;
    const filter: any = {};
    if (assetId) filter.assetId = assetId;
    if (sensorId) filter.sensorId = sensorId;
    if (sensorType) filter.sensorType = sensorType;
    if (status) filter.status = status;
    if (startDate) filter.startDate = new Date(startDate as string);
    if (endDate) filter.endDate = new Date(endDate as string);
    const data = await sensorDataService.getSensorData(filter);
    const limitNum = parseInt(limit as string, 10) || 100;
    res.json(data.slice(0, limitNum));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/sensors/latest:
 *   get:
 *     summary: Get latest sensor reading for a specific sensor
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: query
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sensor ID
 *     responses:
 *       200:
 *         description: Latest sensor reading
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssetSensorData'
 *       404:
 *         description: Sensor reading not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/latest', requirePermission('sensor', 'read'), async (req, res, next) => {
  try {
    const { assetId, sensorId } = req.query;
    if (!assetId || !sensorId) {
      res.status(400).json({ message: 'assetId and sensorId are required' });
      return;
    }
    const latestReading = await sensorDataService.getLatestSensorReading(assetId as string, sensorId as string);
    if (!latestReading) {
      res.status(404).json({ message: 'Sensor reading not found' });
      return;
    }
    res.json(latestReading);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/sensors/data:
 *   post:
 *     summary: Add a new sensor reading
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, sensorId, sensorType, value, unit]
 *             properties:
 *               assetId:
 *                 type: string
 *               sensorId:
 *                 type: string
 *               sensorType:
 *                 type: string
 *               value:
 *                 type: number
 *               unit:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [normal, warning, critical]
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Sensor reading created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/data', requirePermission('sensor', 'create'), async (req, res, next) => {
  try {
    const { assetId, sensorId, sensorType, value, unit } = req.body;
    if (!assetId || !sensorId || !sensorType || value === undefined || !unit) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }
    const sensorReading = await sensorDataService.addSensorReading(req.body);
    res.status(201).json(sensorReading);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/sensors/batch:
 *   post:
 *     summary: Batch ingest sensor readings
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assetId, sensorId, sensorType, unit, readings]
 *             properties:
 *               assetId:
 *                 type: string
 *               sensorId:
 *                 type: string
 *               sensorType:
 *                 type: string
 *               unit:
 *                 type: string
 *               readings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [value, timestamp]
 *                   properties:
 *                     value:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                       enum: [normal, warning, critical]
 *     responses:
 *       201:
 *         description: Batch sensor readings created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/batch', requirePermission('sensor', 'create'), async (req, res, next) => {
  try {
    const { assetId, sensorId, sensorType, unit, readings } = req.body;
    if (!assetId || !sensorId || !sensorType || !unit || !Array.isArray(readings) || readings.length === 0) {
      res.status(400).json({ message: 'Invalid batch format' });
      return;
    }
    const processedReadings = readings.map((reading: any) => ({ ...reading, timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date() }));
    const result = await sensorDataService.ingestSensorDataBatch({ assetId, sensorId, sensorType, unit, readings: processedReadings });
    res.status(201).json({ message: `Successfully ingested ${result.length} readings`, count: result.length });
    return;
  } catch (error: any) {
    res.status(500).json({ message: error.message });
    return;
  }
});

/**
 * @swagger
 * /api/sensors/stats:
 *   get:
 *     summary: Get sensor statistics for a time period
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Sensor statistics
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/stats', requirePermission('sensor', 'read'), async (req, res, next) => {
  try {
    const { assetId, sensorId, startDate, endDate } = req.query;
    if (!assetId || !sensorId) {
      res.status(400).json({ message: 'assetId and sensorId are required' });
      return;
    }
    const stats = await sensorDataService.getSensorStats(
      assetId as string,
      sensorId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    if (!stats) {
      res.status(404).json({ message: 'No data found for the specified parameters' });
      return;
    }
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Predictive Maintenance Routes

/**
 * @swagger
 * /api/sensors/predictions:
 *   get:
 *     summary: Get predictive maintenance forecasts for an asset
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sensorId
 *         schema:
 *           type: string
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *           enum: [linear, exponential, moving-average, threshold]
 *           default: linear
 *     responses:
 *       200:
 *         description: Predictive maintenance forecasts
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/predictions', requirePermission('analytics', 'read'), async (req, res, next) => {
  try {
    const { assetId, sensorId, model } = req.query;
    if (!assetId) {
      res.status(400).json({ message: 'assetId is required' });
      return;
    }
    const predictions = await predictiveMaintenanceService.generatePrediction(
      assetId as string,
      sensorId as string | undefined,
      (model as 'linear' | 'exponential' | 'moving-average' | 'threshold') || 'linear'
    );
    res.json(predictions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/sensors/analytics:
 *   get:
 *     summary: Get time series analytics for sensor data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sensorTypes
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *       - in: query
 *         name: aggregation
 *         schema:
 *           type: string
 *           enum: [avg, min, max, sum, count]
 *           default: avg
 *     responses:
 *       200:
 *         description: Time series analytics
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/analytics', requirePermission('analytics', 'read'), async (req, res, next) => {
  try {
    const { assetId, sensorTypes, startDate, endDate, interval = 'day', aggregation = 'avg' } = req.query;
    if (!assetId) {
      res.status(400).json({ message: 'assetId is required' });
      return;
    }
    let parsedSensorTypes: string[] | undefined;
    if (sensorTypes) {
      if (Array.isArray(sensorTypes)) {
        parsedSensorTypes = (sensorTypes as (string | object)[]).map(String);
      } else {
        parsedSensorTypes = [String(sensorTypes)];
      }
    }
    const analytics = await predictiveMaintenanceService.getTimeSeriesAnalytics({
      assetId: assetId as string,
      sensorTypes: parsedSensorTypes,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      interval: interval as 'hour' | 'day' | 'week' | 'month',
      aggregation: aggregation as 'avg' | 'min' | 'max' | 'sum' | 'count',
    });
    res.json(analytics);
    return;
  } catch (error: any) {
    res.status(500).json({ message: error.message });
    return;
  }
});

export default router;
