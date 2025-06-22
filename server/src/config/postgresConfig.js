const { Sequelize } = require('sequelize');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'postgres-db' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'postgres-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'postgres.log' })
  ]
});

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'prosync_hub',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'postgres',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: msg => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.POSTGRES_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

// Connect to PostgreSQL
async function connectPostgres() {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established successfully');
    
    // In development, sync the models with the database
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
    
    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to PostgreSQL database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  connectPostgres
};
