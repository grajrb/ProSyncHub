import express, { Response } from 'express';
const router = express.Router();
import { AuthRequest, authenticateJWT, authorizeRoles } from '../authMiddleware';
import { sensorDataService } from '../services/sensorDataService';
import { eventLogService } from '../services/eventLogService';
import { chatService } from '../services/chatService';
import { checklistService } from '../services/checklistService';

// --- Predictive Maintenance Service Stub ---
const predictiveMaintenanceService = {
  async getAlerts() {
    // TODO: Implement real predictive logic
    return [
      { id: '1', assetId: 'A1', type: 'vibration', severity: 'critical', message: 'High vibration detected', timestamp: new Date().toISOString() }
    ];
  }
};

// --- Analytics Service Stub ---
const analyticsService = {
  async getKPIs() {
    // TODO: Implement real analytics logic
    return {
      uptime: 99.7,
      mttr: 2.1,
      mtbf: 120.5,
      openWorkOrders: 5
    };
  },
  async getReports() {
    // TODO: Implement real reporting logic
    return [
      { id: 'r1', name: 'Monthly Asset Report', generatedAt: new Date().toISOString() }
    ];
  }
};

// --- Sensor Data Routes ---
router.get('/sensor-data/:id', authenticateJWT, authorizeRoles('admin', 'operator', 'viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const dataArr = await sensorDataService.getSensorData({ assetId: undefined, sensorId: undefined, sensorType: undefined, status: undefined, startDate: undefined, endDate: undefined });
    // Fix: getSensorData does not support _id, so use assetId or filter by id after fetch
    // Instead, fetch all and filter, or add a get by id method if needed
    // For now, try to fetch by assetId (if id is assetId)
    // If you want to fetch by Mongo _id, you need to add a method to the service
    // Here, we assume id is assetId
    const data = dataArr.find(d => d._id?.toString() === id);
    if (!data) return res.status(404).json({ message: 'Sensor data not found' });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching sensor data', error: (error as Error).message });
  }
});

router.get('/sensor-data', authenticateJWT, authorizeRoles('admin', 'operator', 'viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.assetId) filter.assetId = req.query.assetId as string;
    if (req.query.sensorId) filter.sensorId = req.query.sensorId as string;
    if (req.query.sensorType) filter.sensorType = req.query.sensorType as string;
    if (req.query.status) filter.status = req.query.status as string;
    if (req.query.startDate) filter.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filter.endDate = new Date(req.query.endDate as string);
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      sort: req.query.sort ? req.query.sort as string : '-timestamp'
    };
    const sensorData = await sensorDataService.getSensorData(filter, options);
    return res.json(sensorData);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching sensor data', error: (error as Error).message });
  }
});

router.post('/sensor-data', authenticateJWT, authorizeRoles('admin', 'operator'), async (req: AuthRequest, res: Response) => {
  try {
    const sensorReading = await sensorDataService.addSensorReading(req.body);
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('sensor-events', JSON.stringify({ type: 'SENSOR_READING_CREATED', payload: sensorReading }));
    }
    return res.status(201).json(sensorReading);
  } catch (error) {
    return res.status(400).json({ message: 'Error adding sensor reading', error: (error as Error).message });
  }
});

router.get('/sensor-data/latest/:assetId', authenticateJWT, authorizeRoles('admin', 'operator', 'viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const { assetId } = req.params;
    const { sensorId, sensorType } = req.query;
    if (sensorId || sensorType) {
      const latestReading = await sensorDataService.getLatestReading(
        assetId,
        sensorId as string | undefined,
        sensorType as string | undefined
      );
      if (!latestReading) {
        return res.status(404).json({ message: 'No sensor data found for the specified criteria' });
      }
      return res.json(latestReading);
    } else {
      const latestReadings = await sensorDataService.getLatestReadingsForAsset(assetId);
      if (!latestReadings || latestReadings.length === 0) {
        return res.status(404).json({ message: 'No sensor data found for this asset' });
      }
      return res.json(latestReadings);
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching latest sensor readings', error: (error as Error).message });
  }
});

router.get('/sensor-data/aggregated', authenticateJWT, authorizeRoles('admin', 'operator', 'viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.assetId) filter.assetId = req.query.assetId as string;
    if (req.query.sensorId) filter.sensorId = req.query.sensorId as string;
    if (req.query.sensorType) filter.sensorType = req.query.sensorType as string;
    if (req.query.status) filter.status = req.query.status as string;
    if (req.query.startDate) filter.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filter.endDate = new Date(req.query.endDate as string);
    const aggregation = {
      type: req.query.aggregationType as any || 'avg',
      timeUnit: req.query.timeUnit as any || 'day',
    };
    if (!aggregation.type || !aggregation.timeUnit) {
      return res.status(400).json({ message: 'aggregationType and timeUnit parameters are required' });
    }
    const aggregatedData = await sensorDataService.getAggregatedData(filter, aggregation);
    return res.json(aggregatedData);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching aggregated sensor data', error: (error as Error).message });
  }
});

router.delete('/sensor-data/:id', authenticateJWT, authorizeRoles('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await sensorDataService.deleteSensorData(id);
    if (!deleted) return res.status(404).json({ message: 'Sensor data not found' });
    return res.json({ message: 'Sensor data deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting sensor data', error: (error as Error).message });
  }
});

router.put('/sensor-data/:id', authenticateJWT, authorizeRoles('admin', 'operator'), async (req: AuthRequest, res: Response) => {
  try {
    // Patch is supported, not full update, so use patchSensorData
    const { id } = req.params;
    const updated = await sensorDataService.patchSensorData(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Sensor data not found' });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating sensor data', error: (error as Error).message });
  }
});

router.patch('/sensor-data/:id', authenticateJWT, authorizeRoles('admin', 'operator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await sensorDataService.patchSensorData(id, req.body);
    if (!updated) return res.status(404).json({ message: 'Sensor data not found' });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: 'Error patching sensor data', error: (error as Error).message });
  }
});

// ---------- Event Log Routes ----------
/**
 * @openapi
 * /api/mongo/event-logs:
 *   get:
 *     summary: Get event logs with filtering
 *     tags:
 *       - Event Logs
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, error, critical]
 *         description: Filter by severity
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by asset ID
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by work order ID
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *         description: Filter by acknowledged status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limit results
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Skip results (for pagination)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -timestamp
 *         description: Sort field (prefix with - for descending)
 *     responses:
 *       200:
 *         description: Event logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/event-logs', authenticateJWT, authorizeRoles('admin', 'operator', 'viewer'), async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.eventType) filter.eventType = req.query.eventType as string;
    if (req.query.severity) filter.severity = req.query.severity as string;
    if (req.query.source) filter.source = req.query.source as string;
    if (req.query.userId) filter.userId = req.query.userId as string;
    if (req.query.assetId) filter.assetId = req.query.assetId as string;
    if (req.query.workOrderId) filter.workOrderId = req.query.workOrderId as string;
    if (req.query.acknowledged !== undefined) filter.acknowledged = req.query.acknowledged === 'true';
    if (req.query.startDate) filter.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filter.endDate = new Date(req.query.endDate as string);
    
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      sort: req.query.sort ? req.query.sort as string : '-timestamp'
    };
    
    const eventLogs = await eventLogService.getEventLogs(filter, options);
    res.json(eventLogs);
  } catch (error) {
    console.error('Error fetching event logs:', error);
    res.status(500).json({ message: 'Error fetching event logs', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/event-logs:
 *   post:
 *     summary: Create a new event log
 *     tags:
 *       - Event Logs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - source
 *               - message
 *             properties:
 *               eventType:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [info, warning, error, critical]
 *                 default: info
 *               source:
 *                 type: string
 *               message:
 *                 type: string
 *               details:
 *                 type: object
 *               userId:
 *                 type: string
 *               assetId:
 *                 type: string
 *               workOrderId:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Event log created successfully
 *       400:
 *         description: Invalid event log data
 *       401:
 *         description: Unauthorized
 */
router.post('/event-logs', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // If userId is not provided in the request body, use the authenticated user's ID
    if (!req.body.userId && req.user?.id) {
      req.body.userId = req.user.id;
    }
    
    const eventLog = await eventLogService.createEventLog(req.body);
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('event-logs', JSON.stringify({ type: 'EVENT_LOG_CREATED', payload: eventLog }));
    }
    res.status(201).json(eventLog);
  } catch (error) {
    console.error('Error creating event log:', error);
    res.status(400).json({ message: 'Error creating event log', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/event-logs/{id}:
 *   get:
 *     summary: Get event log by ID
 *     tags:
 *       - Event Logs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event log ID
 *     responses:
 *       200:
 *         description: Event log retrieved successfully
 *       404:
 *         description: Event log not found
 *       401:
 *         description: Unauthorized
 */
router.get('/event-logs/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const eventLog = await eventLogService.getEventLogById(id);
    
    if (!eventLog) {
      return res.status(404).json({ message: 'Event log not found' });
    }
    
    res.json(eventLog);
  } catch (error) {
    console.error('Error fetching event log:', error);
    res.status(500).json({ message: 'Error fetching event log', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/event-logs/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge an event log
 *     tags:
 *       - Event Logs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event log ID
 *     responses:
 *       200:
 *         description: Event log acknowledged successfully
 *       404:
 *         description: Event log not found
 *       401:
 *         description: Unauthorized
 */
router.post('/event-logs/:id/acknowledge', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const eventLog = await eventLogService.acknowledgeEventLog(id, userId);
    
    if (!eventLog) {
      return res.status(404).json({ message: 'Event log not found' });
    }
    
    res.json(eventLog);
  } catch (error) {
    console.error('Error acknowledging event log:', error);
    res.status(500).json({ message: 'Error acknowledging event log', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/event-logs/acknowledge-bulk:
 *   post:
 *     summary: Acknowledge multiple event logs
 *     tags:
 *       - Event Logs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventLogIds
 *             properties:
 *               eventLogIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Event logs acknowledged successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/event-logs/acknowledge-bulk', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { eventLogIds } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    if (!eventLogIds || !Array.isArray(eventLogIds) || eventLogIds.length === 0) {
      return res.status(400).json({ message: 'eventLogIds array is required' });
    }
    
    const count = await eventLogService.bulkAcknowledgeEventLogs(eventLogIds, userId);
    res.json({ message: `${count} event logs acknowledged successfully` });
  } catch (error) {
    console.error('Error acknowledging event logs:', error);
    res.status(500).json({ message: 'Error acknowledging event logs', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/event-logs/counts-by-severity:
 *   get:
 *     summary: Get event count by severity
 *     tags:
 *       - Event Logs
 *     parameters:
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by asset ID
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by work order ID
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *         description: Filter by acknowledged status
 *     responses:
 *       200:
 *         description: Event counts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/event-logs/counts-by-severity', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.eventType) filter.eventType = req.query.eventType as string;
    if (req.query.source) filter.source = req.query.source as string;
    if (req.query.userId) filter.userId = req.query.userId as string;
    if (req.query.assetId) filter.assetId = req.query.assetId as string;
    if (req.query.workOrderId) filter.workOrderId = req.query.workOrderId as string;
    if (req.query.acknowledged !== undefined) filter.acknowledged = req.query.acknowledged === 'true';
    
    const counts = await eventLogService.getEventCountsBySeverity(filter);
    res.json(counts);
  } catch (error) {
    console.error('Error fetching event counts:', error);
    res.status(500).json({ message: 'Error fetching event counts', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/event-logs/{id}:
 *   delete:
 *     summary: Delete event log by ID
 *     tags:
 *       - Event Logs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event log ID
 *     responses:
 *       200:
 *         description: Event log deleted successfully
 *       404:
 *         description: Event log not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/event-logs/:id', authenticateJWT, authorizeRoles('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await eventLogService.deleteEventLog(id);
    if (!result) {
      return res.status(404).json({ message: 'Event log not found' });
    }
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('event-logs', JSON.stringify({ type: 'EVENT_LOG_DELETED', payload: { id } }));
    }
    res.json({ message: 'Event log deleted successfully' });
  } catch (error) {
    console.error('Error deleting event log:', error);
    res.status(500).json({ message: 'Error deleting event log', error: (error as Error).message });
  }
});

// Remove or comment out broken event log update/patch routes
// router.put('/event-logs/:id', authenticateJWT, authorizeRoles('admin'), async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     // No updateEventLog method exists; implement if needed
//     // const updated = await eventLogService.updateEventLog(id, req.body);
//     // if (!updated) return res.status(404).json({ message: 'Event log not found' });
//     // return res.json(updated);
//     return res.status(501).json({ message: 'Not implemented' });
//   } catch (error) {
//     return res.status(400).json({ message: 'Error updating event log', error: (error as Error).message });
//   }
// });
// router.patch('/event-logs/:id', authenticateJWT, authorizeRoles('admin'), async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     // No patchEventLog method exists; implement if needed
//     // const updated = await eventLogService.patchEventLog(id, req.body);
//     // if (!updated) return res.status(404).json({ message: 'Event log not found' });
//     // return res.json(updated);
//     return res.status(501).json({ message: 'Not implemented' });
//   } catch (error) {
//     return res.status(400).json({ message: 'Error patching event log', error: (error as Error).message });
//   }
// });

// ---------- Chat Message Routes ----------
/**
 * @openapi
 * /api/mongo/chat/messages/{roomId}:
 *   get:
 *     summary: Get chat messages for a room
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limit results
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *     responses:
 *       200:
 *         description: Chat messages retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/chat/messages/:roomId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const before = req.query.before ? new Date(req.query.before as string) : undefined;
    
    const messages = await chatService.getRoomMessages(roomId, { limit, before });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Error fetching chat messages', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/chat/messages:
 *   post:
 *     summary: Send a new chat message
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - username
 *               - message
 *               - roomId
 *             properties:
 *               userId:
 *                 type: string
 *               username:
 *                 type: string
 *               message:
 *                 type: string
 *               roomId:
 *                 type: string
 *               isSystemMessage:
 *                 type: boolean
 *                 default: false
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [image, document, link]
 *                     url:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid message data
 *       401:
 *         description: Unauthorized
 */
router.post('/chat/messages', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // If userId is not provided in the request body, use the authenticated user's ID
    if (!req.body.userId && req.user?.id) {
      req.body.userId = req.user.id;
    }
    
    const message = await chatService.sendMessage(req.body);
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('chat-messages', JSON.stringify({ type: 'CHAT_MESSAGE_SENT', payload: message }));
    }
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(400).json({ message: 'Error sending chat message', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/chat/messages/{messageId}:
 *   delete:
 *     summary: Delete a chat message
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       403:
 *         description: Unauthorized to delete this message
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/chat/messages/:messageId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const result = await chatService.deleteMessage(messageId, userId);
    if (!result) {
      return res.status(404).json({ message: 'Message not found' });
    }
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('chat-messages', JSON.stringify({ type: 'CHAT_MESSAGE_DELETED', payload: { messageId } }));
    }
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    if ((error as Error).message === 'Unauthorized') {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    res.status(500).json({ message: 'Error deleting chat message', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/chat/messages/{roomId}/read:
 *   post:
 *     summary: Mark messages as read
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of specific message IDs to mark as read
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       401:
 *         description: Unauthorized
 */
router.post('/chat/messages/:roomId/read', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { messageIds } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const count = await chatService.markMessagesAsRead(roomId, userId, messageIds);
    res.json({ message: `${count} messages marked as read` });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Error marking messages as read', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/chat/unread/{userId}:
 *   get:
 *     summary: Get unread message counts for a user
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *         description: Optional room ID to get count for a specific room
 *     responses:
 *       200:
 *         description: Unread message counts
 *       401:
 *         description: Unauthorized
 */
router.get('/chat/unread/:userId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roomId } = req.query;
    
    // Only allow users to get their own unread counts unless they're an admin
    if (userId !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'You can only view your own unread counts' });
    }
    
    const unreadCounts = await chatService.getUnreadCount(userId, roomId as string | undefined);
    res.json(unreadCounts);
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ message: 'Error fetching unread counts', error: (error as Error).message });
  }
});

// ---------- Checklist Routes ----------
/**
 * @openapi
 * /api/mongo/checklists:
 *   get:
 *     summary: Get checklists with filtering
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by title (partial match)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [maintenance, inspection, safety, procedure, other]
 *         description: Filter by checklist type
 *       - in: query
 *         name: assetId
 *         schema:
 *           type: string
 *         description: Filter by asset ID
 *       - in: query
 *         name: workOrderId
 *         schema:
 *           type: string
 *         description: Filter by work order ID
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, completed, overdue, cancelled]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by priority
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *         description: Filter by creator user ID
 *       - in: query
 *         name: dueDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by exact due date
 *       - in: query
 *         name: dueBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by due date before
 *       - in: query
 *         name: dueAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by due date after
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limit results
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Skip results (for pagination)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -createdAt
 *         description: Sort field (prefix with - for descending)
 *     responses:
 *       200:
 *         description: Checklists retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/checklists', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.title) filter.title = req.query.title as string;
    if (req.query.type) filter.type = req.query.type as string;
    if (req.query.assetId) filter.assetId = req.query.assetId as string;
    if (req.query.workOrderId) filter.workOrderId = req.query.workOrderId as string;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo as string;
    if (req.query.status) filter.status = req.query.status as string;
    if (req.query.priority) filter.priority = req.query.priority as string;
    if (req.query.createdBy) filter.createdBy = req.query.createdBy as string;
    if (req.query.dueDate) filter.dueDate = new Date(req.query.dueDate as string);
    if (req.query.dueBefore) filter.dueBefore = new Date(req.query.dueBefore as string);
    if (req.query.dueAfter) filter.dueAfter = new Date(req.query.dueAfter as string);
    
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      sort: req.query.sort ? req.query.sort as string : '-createdAt'
    };
    
    const checklists = await checklistService.getChecklists(filter, options);
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ message: 'Error fetching checklists', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists:
 *   post:
 *     summary: Create a new checklist
 *     tags:
 *       - Checklists
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - items
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [maintenance, inspection, safety, procedure, other]
 *               assetId:
 *                 type: string
 *               workOrderId:
 *                 type: string
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, overdue, cancelled]
 *                 default: draft
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     isCompleted:
 *                       type: boolean
 *                       default: false
 *     responses:
 *       201:
 *         description: Checklist created successfully
 *       400:
 *         description: Invalid checklist data
 *       401:
 *         description: Unauthorized
 */
router.post('/checklists', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // Add creator ID if not provided
    if (!req.body.createdBy && req.user?.id) {
      req.body.createdBy = req.user.id;
    }
    
    const checklist = await checklistService.createChecklist(req.body);
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('checklists', JSON.stringify({ type: 'CHECKLIST_CREATED', payload: checklist }));
    }
    res.status(201).json(checklist);
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(400).json({ message: 'Error creating checklist', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{id}:
 *   get:
 *     summary: Get checklist by ID
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *     responses:
 *       200:
 *         description: Checklist retrieved successfully
 *       404:
 *         description: Checklist not found
 *       401:
 *         description: Unauthorized
 */
router.get('/checklists/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const checklist = await checklistService.getChecklistById(id);
    
    if (!checklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }
    
    res.json(checklist);
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ message: 'Error fetching checklist', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{id}:
 *   put:
 *     summary: Update a checklist
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [maintenance, inspection, safety, procedure, other]
 *               assetId:
 *                 type: string
 *               workOrderId:
 *                 type: string
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, active, completed, overdue, cancelled]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: Checklist updated successfully
 *       404:
 *         description: Checklist not found
 *       400:
 *         description: Invalid checklist data
 *       401:
 *         description: Unauthorized
 */
router.put('/checklists/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const updatedChecklist = await checklistService.updateChecklist(id, req.body, userId);
    
    if (!updatedChecklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }
    
    res.json(updatedChecklist);
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(400).json({ message: 'Error updating checklist', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{id}/items:
 *   post:
 *     summary: Add an item to a checklist
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item added successfully
 *       404:
 *         description: Checklist not found
 *       400:
 *         description: Invalid item data
 *       401:
 *         description: Unauthorized
 */
router.post('/checklists/:id/items', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const updatedChecklist = await checklistService.addChecklistItem(id, req.body, userId);
    
    if (!updatedChecklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }
    
    res.json(updatedChecklist);
  } catch (error) {
    console.error('Error adding checklist item:', error);
    res.status(400).json({ message: 'Error adding checklist item', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{checklistId}/items/{itemId}:
 *   put:
 *     summary: Update a checklist item
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isCompleted:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       404:
 *         description: Checklist or item not found
 *       400:
 *         description: Invalid item data
 *       401:
 *         description: Unauthorized
 */
router.put('/checklists/:checklistId/items/:itemId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId, itemId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const updatedChecklist = await checklistService.updateChecklistItem(checklistId, itemId, req.body, userId);
    
    if (!updatedChecklist) {
      return res.status(404).json({ message: 'Checklist or item not found' });
    }
    
    res.json(updatedChecklist);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(400).json({ message: 'Error updating checklist item', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{checklistId}/items/{itemId}:
 *   delete:
 *     summary: Remove a checklist item
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: checklistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item removed successfully
 *       404:
 *         description: Checklist or item not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/checklists/:checklistId/items/:itemId', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId, itemId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const updatedChecklist = await checklistService.removeChecklistItem(checklistId, itemId, userId);
    
    if (!updatedChecklist) {
      return res.status(404).json({ message: 'Checklist or item not found' });
    }
    
    res.json(updatedChecklist);
  } catch (error) {
    console.error('Error removing checklist item:', error);
    res.status(500).json({ message: 'Error removing checklist item', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{id}/complete:
 *   post:
 *     summary: Mark a checklist as completed
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *     responses:
 *       200:
 *         description: Checklist completed successfully
 *       404:
 *         description: Checklist not found
 *       401:
 *         description: Unauthorized
 */
router.post('/checklists/:id/complete', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not available' });
    }
    
    const completedChecklist = await checklistService.completeChecklist(id, userId);
    
    if (!completedChecklist) {
      return res.status(404).json({ message: 'Checklist not found' });
    }
    
    res.json(completedChecklist);
  } catch (error) {
    console.error('Error completing checklist:', error);
    res.status(500).json({ message: 'Error completing checklist', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/{id}:
 *   delete:
 *     summary: Delete a checklist
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Checklist ID
 *     responses:
 *       200:
 *         description: Checklist deleted successfully
 *       404:
 *         description: Checklist not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/checklists/:id', authenticateJWT, authorizeRoles('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await checklistService.deleteChecklist(id);
    
    if (!result) {
      return res.status(404).json({ message: 'Checklist not found' });
    }
    if (req.app && req.app.locals && req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('checklists', JSON.stringify({ type: 'CHECKLIST_DELETED', payload: { id } }));
    }
    res.json({ message: 'Checklist deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ message: 'Error deleting checklist', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/due-soon:
 *   get:
 *     summary: Get checklists due soon
 *     tags:
 *       - Checklists
 *     parameters:
 *       - in: query
 *         name: daysThreshold
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Days threshold for "due soon"
 *     responses:
 *       200:
 *         description: Checklists retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/checklists/due-soon', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const daysThreshold = req.query.daysThreshold ? parseInt(req.query.daysThreshold as string) : 3;
    const checklists = await checklistService.getChecklistsDueSoon(daysThreshold);
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching checklists due soon:', error);
    res.status(500).json({ message: 'Error fetching checklists due soon', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/overdue:
 *   get:
 *     summary: Get overdue checklists
 *     tags:
 *       - Checklists
 *     responses:
 *       200:
 *         description: Overdue checklists retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/checklists/overdue', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const checklists = await checklistService.getOverdueChecklists();
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching overdue checklists:', error);
    res.status(500).json({ message: 'Error fetching overdue checklists', error: (error as Error).message });
  }
});

/**
 * @openapi
 * /api/mongo/checklists/counts-by-status:
 *   get:
 *     summary: Get checklist counts by status
 *     tags:
 *       - Checklists
 *     responses:
 *       200:
 *         description: Checklist counts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/checklists/counts-by-status', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const counts = await checklistService.getChecklistCountsByStatus();
    res.json(counts);
  } catch (error) {
    console.error('Error fetching checklist counts:', error);
    res.status(500).json({ message: 'Error fetching checklist counts', error: (error as Error).message });
  }
});

// ---------- Checklist Additional CRUD ----------
// Update checklist item by ID (full update)
router.put('/checklists/:checklistId/items/:itemId/full', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { checklistId, itemId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'User ID not available' });
    // updateChecklistItem expects updates: { isCompleted: boolean; notes?: string; }
    // We'll pass req.body as updates, but you may want to validate/transform as needed
    const updated = await checklistService.updateChecklistItem(checklistId, itemId, req.body, userId);
    if (!updated) return res.status(404).json({ message: 'Checklist or item not found' });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating checklist item', error: (error as Error).message });
  }
});

// PATCH (partial update) for checklist by ID
router.patch('/checklists/:id', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'User ID not available' });
    const updated = await checklistService.updateChecklist(id, req.body, userId);
    if (!updated) return res.status(404).json({ message: 'Checklist not found' });
    // TODO: Invalidate cache if using Redis for checklist caching
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: 'Error patching checklist', error: (error as Error).message });
  }
});

// ---------- Redis Pub/Sub Integration Example ----------
// (This is a placeholder. Actual integration should be in your real-time/socket layer.)
// Example: Publish sensor event after new reading
router.post('/sensor-data', authenticateJWT, authorizeRoles('admin', 'operator'), async (req: AuthRequest, res: Response) => {
  try {
    const sensorReading = await sensorDataService.addSensorReading(req.body);
    // Publish to Redis for real-time notification
    if (req.app.locals.redisPublisher) {
      req.app.locals.redisPublisher.publish('sensor-events', JSON.stringify(sensorReading));
    }
    res.status(201).json(sensorReading);
  } catch (error) {
    console.error('Error adding sensor reading:', error);
    res.status(400).json({ message: 'Error adding sensor reading', error: (error as Error).message });
  }
});

// --- Sensor Data Ingestion Endpoint ---
router.post('/sensor-data/ingest', authenticateJWT, authorizeRoles('admin', 'operator'), async (req: AuthRequest, res: Response) => {
  try {
    // Simulate or ingest sensor data (single or batch)
    const data = Array.isArray(req.body) ? req.body : [req.body];
    const results = await Promise.all(data.map(sensorDataService.addSensorReading));
    // Optionally publish to Redis for real-time updates
    if (req.app.locals.redisPublisher) {
      results.forEach(reading => req.app.locals.redisPublisher.publish('sensor-events', JSON.stringify(reading)));
    }
    res.status(201).json({ message: 'Sensor data ingested', results });
  } catch (error) {
    console.error('Error ingesting sensor data:', error);
    res.status(400).json({ message: 'Error ingesting sensor data', error: (error as Error).message });
  }
});

// --- Predictive Maintenance Alerts Endpoint ---
router.get('/predictive/alerts', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    // Example: Use a predictiveMaintenanceService to get alerts
    const alerts = await predictiveMaintenanceService.getAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching predictive alerts:', error);
    res.status(500).json({ message: 'Error fetching predictive alerts', error: (error as Error).message });
  }
});

// --- Analytics/Reporting Endpoints ---
router.get('/analytics/kpi', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const kpis = await analyticsService.getKPIs();
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ message: 'Error fetching KPIs', error: (error as Error).message });
  }
});

router.get('/analytics/reports', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await analyticsService.getReports();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports', error: (error as Error).message });
  }
});

export default router;