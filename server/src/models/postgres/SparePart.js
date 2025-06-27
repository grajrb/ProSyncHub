const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgresConfig');

const SparePart = sequelize.define('SparePart', {
  part_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  part_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  quantity_on_hand: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  reorder_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  unit_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SparePart;
