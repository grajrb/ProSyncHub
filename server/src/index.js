require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');

// Import routes
const assetRoutes = require('./routes/assetRoutes');
const userRoutes = require('./routes/userRoutes');
const workOrderRoutes = require('./routes/workOrderRoutes');
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const predictiveRoutes = require('./routes/predictiveRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import database config
const { connectPostgres } = require('./config/postgresConfig');
const { connectMongoDB } = require('./config/mongoConfig');
const { connectRedis } = require('./config/redisConfig');

// Import socket handlers
const { setupSocketHandlers } = require('./sockets/socketHandlers');

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'prosync-hub-api' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/assets', assetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/predictive', predictiveRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
    }
  });
});

// Connect to databases
async function initDatabases() {
  try {
    await connectPostgres();
    await connectMongoDB();
    await connectRedis();
    logger.info('All database connections established');
    
    // Setup socket handlers only after database connections are established
    setupSocketHandlers(io);
  } catch (error) {
    logger.error('Database connection failed', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  await initDatabases();
});

module.exports = { app, server };
