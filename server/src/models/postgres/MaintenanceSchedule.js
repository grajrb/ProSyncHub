const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgresConfig');

const MaintenanceSchedule = sequelize.define('MaintenanceSchedule', {
  schedule_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  task_description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  frequency: {
    type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM_DAYS'),
    allowNull: false,
    defaultValue: 'MONTHLY'
  },
  custom_days: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  next_due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  last_performed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaintenanceSchedule;
