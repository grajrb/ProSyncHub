const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'mongodb' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'mongodb-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'mongodb.log' })
  ]
});

// Connect to MongoDB
async function connectMongoDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prosync_hub';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    logger.info('MongoDB connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to MongoDB:', error);
    throw error;
  }
}

module.exports = {
  connectMongoDB
};
