const User = require('./postgres/User');
const Role = require('./postgres/Role');
const Permission = require('./postgres/Permission');
const Plant = require('./postgres/Plant');
const Location = require('./postgres/Location');
const AssetType = require('./postgres/AssetType');
const Asset = require('./postgres/Asset');
const WorkOrder = require('./postgres/WorkOrder');
const MaintenanceSchedule = require('./postgres/MaintenanceSchedule');
const SparePart = require('./postgres/SparePart');

// Define relationships between models

// User belongs to Role
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// Role has many Permissions through RolePermission join table
Role.belongsToMany(Permission, { through: 'RolePermission', foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: 'RolePermission', foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });

// Location belongs to Plant
Location.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant' });
Plant.hasMany(Location, { foreignKey: 'plant_id', as: 'locations' });

// Asset belongs to AssetType
Asset.belongsTo(AssetType, { foreignKey: 'asset_type_id', as: 'asset_type' });
AssetType.hasMany(Asset, { foreignKey: 'asset_type_id', as: 'assets' });

// Asset belongs to Location
Asset.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });
Location.hasMany(Asset, { foreignKey: 'location_id', as: 'assets' });

// Asset can have a parent Asset
Asset.belongsTo(Asset, { foreignKey: 'parent_asset_id', as: 'parent_asset' });
Asset.hasMany(Asset, { foreignKey: 'parent_asset_id', as: 'child_assets' });

// WorkOrder belongs to Asset
WorkOrder.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
Asset.hasMany(WorkOrder, { foreignKey: 'asset_id', as: 'work_orders' });

// WorkOrder assigned to User
WorkOrder.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assigned_to' });
User.hasMany(WorkOrder, { foreignKey: 'assigned_to_user_id', as: 'assigned_work_orders' });

// WorkOrder reported by User
WorkOrder.belongsTo(User, { foreignKey: 'reported_by_user_id', as: 'reported_by' });
User.hasMany(WorkOrder, { foreignKey: 'reported_by_user_id', as: 'reported_work_orders' });

// MaintenanceSchedule belongs to Asset
MaintenanceSchedule.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
Asset.hasMany(MaintenanceSchedule, { foreignKey: 'asset_id', as: 'maintenance_schedules' });

// WorkOrder can have many SpareParts through WorkOrderPart join table
WorkOrder.belongsToMany(SparePart, { through: 'WorkOrderPart', foreignKey: 'work_order_id', otherKey: 'part_id', as: 'spare_parts' });
SparePart.belongsToMany(WorkOrder, { through: 'WorkOrderPart', foreignKey: 'part_id', otherKey: 'work_order_id', as: 'work_orders' });

// SparePart belongs to Location
SparePart.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });
Location.hasMany(SparePart, { foreignKey: 'location_id', as: 'spare_parts' });

module.exports = {
  User,
  Role,
  Permission,
  Plant,
  Location,
  AssetType,
  Asset,
  WorkOrder,
  MaintenanceSchedule,
  SparePart
};
