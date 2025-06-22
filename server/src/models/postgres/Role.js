const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/postgresConfig');

const Role = sequelize.define('Role', {
  role_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'bg-industrial-blue'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Role;
