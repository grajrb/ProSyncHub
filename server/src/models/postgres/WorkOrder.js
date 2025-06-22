const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgresConfig');

const WorkOrder = sequelize.define('WorkOrder', {
  work_order_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'OPEN'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false,
    defaultValue: 'MEDIUM'
  },
  type: {
    type: DataTypes.ENUM('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'),
    allowNull: false,
    defaultValue: 'CORRECTIVE'
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completion_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimated_hours: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  actual_hours: {
    type: DataTypes.FLOAT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = WorkOrder;
