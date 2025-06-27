const winston = require('winston');
const { connectRedis, getRedisClient } = require('../config/redisConfig');
const { createNotificationInternal } = require('../controllers/notificationController');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'socket-handlers' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'socket-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'socket.log' })
  ]
});

// Set up Socket.IO handlers
function setupSocketHandlers(io) {
  // Store active users
  const activeUsers = new Map();
  
  // Subscribe to Redis channels
  const setupRedisSubscriber = async () => {
    try {
      const redisClient = getRedisClient();
      const subscriber = redisClient.duplicate();
      await subscriber.connect();
      
      // Subscribe to notifications channel
      await subscriber.subscribe('notifications', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.event === 'new_notification') {
            const { notification } = data;
            
            // Emit to specific user
            io.to(`user:${notification.user_id}`).emit('notification', notification);
          }
        } catch (error) {
          logger.error('Error processing Redis notification message:', error);
        }
      });
      
      // Subscribe to asset updates channel
      await subscriber.subscribe('asset_updates', (message) => {
        try {
          const data = JSON.parse(message);
          io.to(`asset:${data.asset_id}`).emit('asset_update', data);
          
          // Also send to admin and maintenance roles
          io.to('role:admin').emit('asset_update', data);
          io.to('role:maintenance').emit('asset_update', data);
        } catch (error) {
          logger.error('Error processing Redis asset update message:', error);
        }
      });
      
      // Subscribe to work order updates channel
      await subscriber.subscribe('work_order_updates', (message) => {
        try {
          const data = JSON.parse(message);
          io.to(`workorder:${data.work_order_id}`).emit('work_order_update', data);
          
          // Also send to assigned user if available
          if (data.assigned_to_id) {
            io.to(`user:${data.assigned_to_id}`).emit('work_order_update', data);
          }
          
          // Also send to admin and maintenance roles
          io.to('role:admin').emit('work_order_update', data);
          io.to('role:maintenance').emit('work_order_update', data);
        } catch (error) {
          logger.error('Error processing Redis work order update message:', error);
        }
      });
      
      logger.info('Redis subscriptions set up successfully');
    } catch (error) {
      logger.error('Failed to set up Redis subscriptions:', error);
    }
  };
  
  // Set up Redis subscriptions
  setupRedisSubscriber();
  
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Handle user authentication and joining rooms
    socket.on('authenticate', async (userData) => {
      try {
        const { user_id, username, role } = userData;
        
        if (!user_id) {
          socket.emit('error', { message: 'Authentication failed: Invalid user data' });
          return;
        }
        
        // Store user data and socket ID mapping
        activeUsers.set(socket.id, { user_id, username, role });
        
        // Join user-specific room
        socket.join(`user:${user_id}`);
        
        // Join role-based room
        if (role) {
          socket.join(`role:${role.role_name.toLowerCase()}`);
        }
        
        logger.info(`User authenticated: ${username} (${user_id})`);
        
        // Emit authentication success
        socket.emit('authenticated', { 
          status: 'success',
          user_id,
          socket_id: socket.id
        });
        
        // Notify other admins/supervisors about this user's online status
        if (role && ['Administrator', 'Supervisor'].includes(role.role_name)) {
          socket.to('role:administrator').to('role:supervisor').emit('user:online', {
            user_id,
            username,
            timestamp: new Date().toISOString()
          });
        }
        
        // Publish user online status to Redis for other services
        const redisClient = getRedisClient();
        await redisClient.publish('user:status', JSON.stringify({
          status: 'online',
          user_id,
          username,
          timestamp: new Date().toISOString()
        }));
        
      } catch (error) {
        logger.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed: Server error' });
      }
    });
    
    // Subscribe to asset updates
    socket.on('subscribe:asset', (assetId) => {
      if (!assetId) return;
      
      logger.info(`Client ${socket.id} subscribed to asset: ${assetId}`);
      socket.join(`asset:${assetId}`);
      socket.emit('subscribed:asset', { asset_id: assetId });
    });
    
    // Unsubscribe from asset updates
    socket.on('unsubscribe:asset', (assetId) => {
      if (!assetId) return;
      
      logger.info(`Client ${socket.id} unsubscribed from asset: ${assetId}`);
      socket.leave(`asset:${assetId}`);
    });
    
    // Subscribe to work order updates
    socket.on('subscribe:workOrder', (workOrderId) => {
      if (!workOrderId) return;
      
      logger.info(`Client ${socket.id} subscribed to work order: ${workOrderId}`);
      socket.join(`workOrder:${workOrderId}`);
      socket.emit('subscribed:workOrder', { work_order_id: workOrderId });
    });
    
    // Unsubscribe from work order updates
    socket.on('unsubscribe:workOrder', (workOrderId) => {
      if (!workOrderId) return;
      
      logger.info(`Client ${socket.id} unsubscribed from work order: ${workOrderId}`);
      socket.leave(`workOrder:${workOrderId}`);
    });
    
    // Chat message handler
    socket.on('chat:message', async (message) => {
      try {
        const { room_id, room_type, content } = message;
        const user = activeUsers.get(socket.id);
        
        if (!user || !room_id || !content) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }
        
        const newMessage = {
          room_id,
          room_type,
          sender_user_id: user.user_id,
          sender_username: user.username,
          timestamp: new Date().toISOString(),
          content,
          read_by: [user.user_id]
        };
        
        // Save message to MongoDB (done by chat service)
        
        // Broadcast to room
        socket.to(`${room_type.toLowerCase()}:${room_id}`).emit('chat:message', newMessage);
        
      } catch (error) {
        logger.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Typing indicator
    socket.on('chat:typing', (data) => {
      const { room_id, room_type, is_typing } = data;
      const user = activeUsers.get(socket.id);
      
      if (!user || !room_id) return;
      
      socket.to(`${room_type.toLowerCase()}:${room_id}`).emit('chat:typing', {
        user_id: user.user_id,
        username: user.username,
        is_typing,
        room_id,
        room_type
      });
    });
    
    // Disconnection handler
    socket.on('disconnect', async () => {
      try {
        const user = activeUsers.get(socket.id);
        
        if (user) {
          logger.info(`User disconnected: ${user.username} (${user.user_id})`);
          
          // Notify other users about this user's offline status
          if (user.role && ['Administrator', 'Supervisor'].includes(user.role.role_name)) {
            socket.to('role:administrator').to('role:supervisor').emit('user:offline', {
              user_id: user.user_id,
              username: user.username,
              timestamp: new Date().toISOString()
            });
          }
          
          // Publish user offline status to Redis for other services
          const redisClient = getRedisClient();
          await redisClient.publish('user:status', JSON.stringify({
            status: 'offline',
            user_id: user.user_id,
            username: user.username,
            timestamp: new Date().toISOString()
          }));
          
          // Remove from active users
          activeUsers.delete(socket.id);
        } else {
          logger.info(`Client disconnected: ${socket.id}`);
        }
      } catch (error) {
        logger.error('Disconnect error:', error);
      }
    });
  });
  
  // Set up Redis pub/sub for cross-server communication
  setupRedisPubSub(io);
  
  return io;
}

// Set up Redis pub/sub for handling events across multiple server instances
async function setupRedisPubSub(io) {
  try {
    const redisClient = getRedisClient();
    const publisher = redisClient.duplicate();
    await publisher.connect();
    
    // Subscribe to asset update events
    await redisClient.subscribe('asset:update', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`asset:${data.asset_id}`).emit('asset:update', data);
      } catch (error) {
        logger.error('Redis asset:update error:', error);
      }
    });
    
    // Subscribe to sensor reading events
    await redisClient.subscribe('sensor:reading', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`asset:${data.asset_id}`).emit('sensor:reading', data);
      } catch (error) {
        logger.error('Redis sensor:reading error:', error);
      }
    });
    
    // Subscribe to alert events
    await redisClient.subscribe('alert:new', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Send to all users who should see this alert
        io.to(`asset:${data.asset_id}`).emit('alert:new', data);
        
        // Send to specific users if targeted
        if (data.target_user_ids && Array.isArray(data.target_user_ids)) {
          data.target_user_ids.forEach(userId => {
            io.to(`user:${userId}`).emit('alert:new', data);
          });
        }
        
        // Send to specific roles if defined
        if (data.target_roles && Array.isArray(data.target_roles)) {
          data.target_roles.forEach(role => {
            io.to(`role:${role.toLowerCase()}`).emit('alert:new', data);
          });
        }
      } catch (error) {
        logger.error('Redis alert:new error:', error);
      }
    });
    
    // Subscribe to work order events
    await redisClient.subscribe('workOrder:update', (message) => {
      try {
        const data = JSON.parse(message);
        io.to(`workOrder:${data.work_order_id}`).emit('workOrder:update', data);
        
        // Also notify assigned user
        if (data.assigned_to_user_id) {
          io.to(`user:${data.assigned_to_user_id}`).emit('workOrder:assigned', data);
        }
      } catch (error) {
        logger.error('Redis workOrder:update error:', error);
      }
    });
    
    logger.info('Redis PubSub listeners configured successfully');
  } catch (error) {
    logger.error('Failed to set up Redis PubSub:', error);
  }
}

module.exports = { setupSocketHandlers };
