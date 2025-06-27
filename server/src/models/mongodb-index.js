const AssetSensorReading = require('./mongodb/AssetSensorReading');
const AssetEventLog = require('./mongodb/AssetEventLog');
const UserActivityFeed = require('./mongodb/UserActivityFeed');
const ChatMessage = require('./mongodb/ChatMessage');
const MaintenanceChecklist = require('./mongodb/MaintenanceChecklist');

module.exports = {
  AssetSensorReading,
  AssetEventLog,
  UserActivityFeed,
  ChatMessage,
  MaintenanceChecklist
};
