const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgresConfig');

const Asset = sequelize.define('Asset', {
  asset_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  asset_tag: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true
  },
  manufacturer: {
    type: DataTypes.STRING,
    allowNull: true
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  installation_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  documentation_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  qr_code_path: {
    type: DataTypes.STRING,
    allowNull: true
  },
  current_status: {
    type: DataTypes.ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR', 'WARNING'),
    allowNull: false,
    defaultValue: 'ONLINE'
  },
  health_score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    validate: {
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Asset;
