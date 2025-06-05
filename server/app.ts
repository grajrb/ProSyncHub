// Application Insights setup
import appInsights from 'applicationinsights';
if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
  appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
}

import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

import { RedisStore } from 'connect-redis';
import express from 'express';
import mongoRoutes from './routes/mongoRoutes';
import sensorRoutes from './routes/sensorRoutes';
import session from 'express-session';
import { createClient } from 'redis';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();

// Redis setup
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);
const redisPublisher = redisClient.duplicate();
redisPublisher.connect().catch(console.error);

// Session middleware
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  })
);

// Attach redisPublisher to app locals for pub/sub in routes
app.locals.redisPublisher = redisPublisher;

// Register mongoRoutes and sensorRoutes
app.use('/api/mongo', mongoRoutes);
app.use('/api/sensors', sensorRoutes);

// Socket.IO setup for real-time notifications
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

redisClient.subscribe('sensor-events', (message) => {
  io.emit('sensor-event', JSON.parse(message));
});

// Example: Emit to Redis on sensor data change (to be called in your service)
export function publishSensorEvent(event: any) {
  redisPublisher.publish('sensor-events', JSON.stringify(event));
}

server.listen(process.env.PORT || 3000, () => {
  logger.info(`Server running on port ${process.env.PORT || 3000}`);
});

export default server;