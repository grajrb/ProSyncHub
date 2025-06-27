/**
 * Logging middleware for Express
 * Provides structured logging with Winston and performance monitoring
 */

const winston = require('winston');
const expressWinston = require('express-winston');
const { format } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configure application insights if enabled
let appInsights = null;
if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true' && process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights = require('applicationinsights');
  appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true) // collect CPU and memory
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C);
  appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'prosync-backend';
  appInsights.start();
}

// Define log directory
const logDir = process.env.LOG_DIR || 'logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Define logger format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'prosync-backend' },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`)
      )
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],
  exitOnError: false
});

// Error log transport for critical errors
const errorLogTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d'
});

logger.add(errorLogTransport);

// Capture unhandled exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  if (appInsights) {
    appInsights.defaultClient.trackException({ exception: error });
  }
  
  // Give time to log the error before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (appInsights) {
    appInsights.defaultClient.trackException({ exception: reason });
  }
});

// Request logging middleware
const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req, res) => {
    // Skip logging for health checks and static content
    return req.path.startsWith('/health') || 
           req.path.startsWith('/static') || 
           req.path === '/favicon.ico';
  }
});

// Error logging middleware
const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: 'Error {{err.message}} - {{req.method}} {{req.url}}',
  colorize: false
});

// Performance monitoring middleware
const performanceMonitoring = (req, res, next) => {
  if (process.env.ENABLE_PERFORMANCE_MONITORING !== 'true') {
    return next();
  }
  
  const startTime = process.hrtime();
  
  // Log request to Application Insights if configured
  if (appInsights) {
    const requestTelemetry = {
      name: `${req.method} ${req.route ? req.route.path : req.path}`,
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      time: new Date(),
      source: req.ip,
      success: true
    };
    
    appInsights.defaultClient.trackRequest(requestTelemetry);
  }
  
  // Function to track response metrics
  const trackResponseMetrics = () => {
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    logger.debug('Performance', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime} ms`
    });
    
    // Track custom metrics in Application Insights if configured
    if (appInsights) {
      appInsights.defaultClient.trackMetric({
        name: 'ResponseTime',
        value: parseFloat(responseTime),
        properties: {
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: res.statusCode
        }
      });
      
      // Track dependency calls if any were made
      if (req.dependencies) {
        req.dependencies.forEach(dep => {
          appInsights.defaultClient.trackDependency({
            target: dep.target,
            name: dep.name,
            data: dep.data,
            duration: dep.duration,
            success: dep.success,
            resultCode: dep.resultCode,
            dependencyTypeName: dep.type
          });
        });
      }
    }
    
    // Clean up event listeners
    res.removeListener('finish', trackResponseMetrics);
    res.removeListener('close', trackResponseMetrics);
    res.removeListener('error', trackResponseMetrics);
  };
  
  // Add listeners to track response lifecycle
  res.on('finish', trackResponseMetrics);
  res.on('close', trackResponseMetrics);
  res.on('error', trackResponseMetrics);
  
  // Add dependency tracking helper to the request object
  req.trackDependency = (dependencyData) => {
    if (!req.dependencies) {
      req.dependencies = [];
    }
    req.dependencies.push(dependencyData);
  };
  
  next();
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceMonitoring,
  appInsights
};
