# ProSyncHub Database Schema Documentation

This document provides a detailed overview of the database schema used in ProSyncHub, including table structures, relationships, and data types for both PostgreSQL and MongoDB.

## PostgreSQL Schema (Relational Data)

### Users

Stores user account information.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| user_id          | UUID          | Primary key                               |
| username         | VARCHAR(50)   | Unique username                           |
| email            | VARCHAR(255)  | Unique email address                      |
| password         | VARCHAR(255)  | Hashed password                           |
| first_name       | VARCHAR(50)   | User's first name                         |
| last_name        | VARCHAR(50)   | User's last name                          |
| role_id          | INTEGER       | Foreign key to Roles table                |
| phone_number     | VARCHAR(20)   | User's phone number                       |
| department       | VARCHAR(100)  | Department name                           |
| profile_image_url| VARCHAR(255)  | URL to profile image                      |
| is_active        | BOOLEAN       | Account status                            |
| last_login       | TIMESTAMP     | Last login timestamp                      |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |
| created_by       | UUID          | User who created this record              |
| updated_by       | UUID          | User who last updated this record         |

### Roles

Defines user roles and their capabilities.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| role_id          | INTEGER       | Primary key                               |
| name             | VARCHAR(50)   | Role name (Administrator, Manager, etc.)  |
| description      | TEXT          | Role description                          |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### Permissions

Defines individual permissions that can be assigned to roles.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| permission_id    | INTEGER       | Primary key                               |
| name             | VARCHAR(100)  | Permission name                           |
| description      | TEXT          | Permission description                    |
| resource         | VARCHAR(50)   | Resource this permission applies to       |
| action           | VARCHAR(20)   | Action type (read, write, delete, etc.)   |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### RolePermissions

Junction table linking roles to permissions.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| role_id          | INTEGER       | Foreign key to Roles table                |
| permission_id    | INTEGER       | Foreign key to Permissions table          |
| created_at       | TIMESTAMP     | Creation timestamp                        |

### Assets

Stores information about industrial assets.

| Column               | Type          | Description                               |
|----------------------|---------------|-------------------------------------------|
| asset_id             | UUID          | Primary key                               |
| name                 | VARCHAR(100)  | Asset name                                |
| description          | TEXT          | Asset description                         |
| asset_type_id        | INTEGER       | Foreign key to AssetTypes table           |
| status               | VARCHAR(50)   | Current status                            |
| health_score         | INTEGER       | Current health score (0-100)              |
| location_id          | INTEGER       | Foreign key to Locations table            |
| manufacturer         | VARCHAR(100)  | Manufacturer name                         |
| model                | VARCHAR(100)  | Model number/name                         |
| serial_number        | VARCHAR(100)  | Serial number                             |
| installation_date    | DATE          | Installation date                         |
| purchase_cost        | DECIMAL(12,2) | Purchase cost                             |
| expected_lifetime    | INTEGER       | Expected lifetime in months               |
| warranty_expiry_date | DATE          | Warranty expiration date                  |
| last_maintenance_date| DATE          | Last maintenance date                     |
| next_maintenance_date| DATE          | Next scheduled maintenance date           |
| parent_asset_id      | UUID          | Parent asset (for component hierarchy)    |
| qr_code              | VARCHAR(255)  | QR code for mobile scanning               |
| image_url            | VARCHAR(255)  | Asset image URL                           |
| created_at           | TIMESTAMP     | Creation timestamp                        |
| updated_at           | TIMESTAMP     | Last update timestamp                     |
| created_by           | UUID          | User who created this record              |
| updated_by           | UUID          | User who last updated this record         |

### AssetTypes

Categorizes assets by type.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| asset_type_id    | INTEGER       | Primary key                               |
| name             | VARCHAR(100)  | Type name (Pump, Motor, etc.)             |
| description      | TEXT          | Type description                          |
| icon             | VARCHAR(50)   | Icon name                                 |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### AssetMetrics

Stores the current metrics for assets.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| metric_id        | UUID          | Primary key                               |
| asset_id         | UUID          | Foreign key to Assets table               |
| metric_name      | VARCHAR(50)   | Metric name (temperature, pressure, etc.) |
| metric_value     | DECIMAL(12,4) | Current metric value                      |
| unit             | VARCHAR(20)   | Unit of measurement                       |
| min_threshold    | DECIMAL(12,4) | Minimum acceptable value                  |
| max_threshold    | DECIMAL(12,4) | Maximum acceptable value                  |
| warning_threshold| DECIMAL(12,4) | Warning threshold value                   |
| critical_threshold| DECIMAL(12,4)| Critical threshold value                  |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### Locations

Stores information about physical locations.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| location_id      | INTEGER       | Primary key                               |
| name             | VARCHAR(100)  | Location name                             |
| description      | TEXT          | Location description                      |
| address          | TEXT          | Physical address                          |
| city             | VARCHAR(100)  | City                                      |
| state            | VARCHAR(100)  | State/Province                            |
| country          | VARCHAR(100)  | Country                                   |
| postal_code      | VARCHAR(20)   | Postal/ZIP code                           |
| latitude         | DECIMAL(10,7) | GPS latitude                              |
| longitude        | DECIMAL(10,7) | GPS longitude                             |
| parent_location_id| INTEGER      | Parent location (for location hierarchy)  |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### WorkOrders

Stores maintenance work orders.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| work_order_id    | UUID          | Primary key                               |
| title            | VARCHAR(100)  | Work order title                          |
| description      | TEXT          | Work order description                    |
| asset_id         | UUID          | Foreign key to Assets table               |
| status           | VARCHAR(50)   | Current status                            |
| priority         | VARCHAR(20)   | Priority level                            |
| type             | VARCHAR(50)   | Work order type                           |
| assigned_to_id   | UUID          | Foreign key to Users table                |
| created_by       | UUID          | Foreign key to Users table                |
| estimated_hours  | DECIMAL(6,2)  | Estimated hours to complete               |
| actual_hours     | DECIMAL(6,2)  | Actual hours spent                        |
| due_date         | DATE          | Due date                                  |
| completion_date  | DATE          | Completion date                           |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |
| updated_by       | UUID          | User who last updated this record         |

### WorkOrderChecklist

Stores checklist items for work orders.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| checklist_item_id| UUID          | Primary key                               |
| work_order_id    | UUID          | Foreign key to WorkOrders table           |
| task             | VARCHAR(255)  | Task description                          |
| is_completed     | BOOLEAN       | Completion status                         |
| completed_by     | UUID          | Foreign key to Users table                |
| completed_at     | TIMESTAMP     | Completion timestamp                      |
| notes            | TEXT          | Additional notes                          |
| sequence         | INTEGER       | Display order                             |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### Parts

Stores information about parts and inventory.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| part_id          | UUID          | Primary key                               |
| name             | VARCHAR(100)  | Part name                                 |
| description      | TEXT          | Part description                          |
| sku              | VARCHAR(50)   | Stock keeping unit                        |
| category         | VARCHAR(50)   | Part category                             |
| cost             | DECIMAL(10,2) | Unit cost                                 |
| quantity_in_stock| INTEGER       | Current quantity in stock                 |
| reorder_point    | INTEGER       | Quantity at which to reorder              |
| reorder_quantity | INTEGER       | Quantity to order when reordering         |
| location_id      | INTEGER       | Foreign key to Locations table            |
| supplier         | VARCHAR(100)  | Supplier name                             |
| image_url        | VARCHAR(255)  | Part image URL                            |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

### WorkOrderParts

Links parts to work orders.

| Column           | Type          | Description                               |
|------------------|---------------|-------------------------------------------|
| work_order_id    | UUID          | Foreign key to WorkOrders table           |
| part_id          | UUID          | Foreign key to Parts table                |
| quantity         | INTEGER       | Quantity of parts used                    |
| cost             | DECIMAL(10,2) | Cost of parts used                        |
| created_at       | TIMESTAMP     | Creation timestamp                        |
| updated_at       | TIMESTAMP     | Last update timestamp                     |

## MongoDB Collections (Document Data)

### AssetMetricsHistory

Stores historical metrics data for assets.

```json
{
  "_id": "ObjectId",
  "asset_id": "UUID",
  "timestamp": "ISODate",
  "metrics": {
    "temperature": 75.2,
    "pressure": 42.5,
    "vibration": 0.24,
    "custom_metric_1": 123.45,
    "custom_metric_2": 67.89
  },
  "created_at": "ISODate"
}
```

### UserActivityFeed

Tracks user activity for the activity feed.

```json
{
  "_id": "ObjectId",
  "user_id": "UUID",
  "activity_type": "String", // e.g., "LOGIN", "WORK_ORDER_CREATED", "ASSET_UPDATED"
  "description": "String",
  "timestamp": "ISODate",
  "metadata": {
    "target_id": "UUID",
    "target_type": "String",
    "additional_info": "Object"
  }
}
```

### Notifications

Stores system notifications.

```json
{
  "_id": "ObjectId",
  "user_id": "UUID",
  "title": "String",
  "message": "String",
  "type": "String", // e.g., "ALERT", "INFO", "WARNING"
  "is_read": "Boolean",
  "is_dismissed": "Boolean",
  "related_entity": {
    "entity_id": "UUID",
    "entity_type": "String" // e.g., "ASSET", "WORK_ORDER"
  },
  "created_at": "ISODate"
}
```

### WorkOrderComments

Stores comments on work orders.

```json
{
  "_id": "ObjectId",
  "work_order_id": "UUID",
  "user_id": "UUID",
  "content": "String",
  "attachments": [
    {
      "filename": "String",
      "url": "String",
      "file_type": "String",
      "file_size": "Number"
    }
  ],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### AuditLogs

Tracks system actions for auditing purposes.

```json
{
  "_id": "ObjectId",
  "user_id": "UUID",
  "action": "String", // e.g., "CREATE", "UPDATE", "DELETE"
  "entity_type": "String", // e.g., "USER", "ASSET", "WORK_ORDER"
  "entity_id": "UUID",
  "previous_state": "Object",
  "new_state": "Object",
  "ip_address": "String",
  "user_agent": "String",
  "timestamp": "ISODate"
}
```

### PredictiveMaintenanceResults

Stores results from predictive maintenance algorithms.

```json
{
  "_id": "ObjectId",
  "asset_id": "UUID",
  "prediction_type": "String", // e.g., "FAILURE_PREDICTION", "REMAINING_USEFUL_LIFE"
  "prediction_result": {
    "prediction": "Number",
    "probability": "Number",
    "confidence_interval": {
      "lower": "Number",
      "upper": "Number"
    }
  },
  "input_features": "Object",
  "model_version": "String",
  "created_at": "ISODate"
}
```

## Database Relationships

### Entity Relationship Diagram (PostgreSQL)

```
Users >--< Roles >--< Permissions
Assets >-- AssetTypes
Assets >-- Locations
Assets >-- AssetMetrics
WorkOrders >-- Assets
WorkOrders >-- Users (assigned_to)
WorkOrders >-- Users (created_by)
WorkOrders >-- WorkOrderChecklist
WorkOrders >--< Parts (through WorkOrderParts)
Parts >-- Locations
```

## Indexing Strategy

### PostgreSQL Indexes

- `users_username_idx`: Unique index on `users(username)`
- `users_email_idx`: Unique index on `users(email)`
- `assets_name_idx`: Index on `assets(name)`
- `assets_status_idx`: Index on `assets(status)`
- `assets_type_idx`: Index on `assets(asset_type_id)`
- `work_orders_status_idx`: Index on `work_orders(status)`
- `work_orders_asset_idx`: Index on `work_orders(asset_id)`
- `work_orders_assigned_to_idx`: Index on `work_orders(assigned_to_id)`

### MongoDB Indexes

- `asset_metrics_history_asset_id_timestamp`: Index on `assetMetricsHistory(asset_id, timestamp)`
- `user_activity_feed_user_id_timestamp`: Index on `userActivityFeed(user_id, timestamp)`
- `notifications_user_id_read`: Index on `notifications(user_id, is_read, created_at)`
- `work_order_comments_work_order_id`: Index on `workOrderComments(work_order_id, created_at)`

## Data Validation and Constraints

### PostgreSQL Constraints

- Foreign key constraints ensure referential integrity
- Check constraints for:
  - Asset health score range (0-100)
  - Work order priority values
  - Valid status values
  - Positive numeric values

### MongoDB Validation

Validation rules for MongoDB collections:

- Required fields
- Data type validation
- Enum value validation
- Range validation for numeric fields

## Query Optimization

Key considerations for optimizing database performance:

1. Use appropriate indexes for frequent query patterns
2. Implement pagination for large result sets
3. Use query optimization techniques:
   - Selective WHERE clauses
   - JOIN optimization
   - Index-aligned sorting
4. Implement caching for frequently accessed, rarely changed data
5. Regularly analyze and optimize query performance

## Data Archiving Strategy

For historical data management:

1. **Time-based Partitioning**: Partition time-series data by month/year
2. **Archiving Policy**:
   - Move completed work orders older than 1 year to archive tables
   - Archive asset metrics history older than 3 months to lower-cost storage
3. **Retention Policy**:
   - Keep active data in primary tables
   - Keep archived data accessible but on different storage tiers
   - Permanently delete data beyond retention requirements (typically 7 years)

## Backup and Recovery

Database backup strategy:

1. **PostgreSQL**:
   - Daily full backups
   - Continuous WAL (Write-Ahead Log) archiving
   - Point-in-time recovery capability

2. **MongoDB**:
   - Daily full backups
   - Replica sets for high availability
   - Oplog for point-in-time recovery
