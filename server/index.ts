import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerDefinition, apis } from './swaggerDef.js';
import { authenticateJWT, authorizeRoles, AuthRequest } from './authMiddleware';
import { connectToMongoDB } from './mongodb';
// import { connectToRedis } from './redis';
import { connectToRedis } from './redis';
import mongoRoutes from './routes/mongoRoutes';
import authRoutes from './routes/authRoutes';
import sensorRoutes from './routes/sensorRoutes';
import eventLogRoutes from './routes/eventLogRoutes';
import chatRoutes from './routes/chatRoutes';
import checklistRoutes from './routes/checklistRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize MongoDB and Redis connections
(async () => {
  try {
    await connectToMongoDB();
    await connectToRedis();
  } catch (error) {
    console.error('Failed to initialize database connections:', error);
    process.exit(1);
  }
})();

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

const swaggerSpec = swaggerJSDoc({ swaggerDefinition, apis });
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint for Kubernetes probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Auth routes - these need to be before the JWT middleware
app.use('/api/auth', authRoutes);

// Protect all /api routes by default (except auth)
app.use('/api', (req, res, next) => {
  Promise.resolve(authenticateJWT(req, res, next)).catch(next);
});

// Import enhanced RBAC middleware
import { requirePermissionAuto } from './rbac';
import type { RequestHandler } from "express";

// Apply automatic RBAC to all protected routes (except /api/auth)
app.use('/api', requirePermissionAuto() as RequestHandler);

// Register MongoDB routes (already protected by the middleware above)
app.use('/api/mongo', mongoRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/event-logs', eventLogRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/analytics', analyticsRoutes);

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
