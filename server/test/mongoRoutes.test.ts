import request from 'supertest';
import server from '../app';
import { RedisStore } from 'connect-redis';
import AssetSensorData from '../models/AssetSensorData';

describe('Sensor Data API', () => {
  let sensorDataId: string;
  
  it('should create a new sensor reading', async () => {
    const res = await request(server)
      .post('/api/mongo/sensor-data')
      .send({
        assetId: 'asset-123',
        sensorId: 'sensor-123',
        sensorType: 'temperature',
        value: 25.5,
        unit: 'C',
      })
      .expect(201);
    
    sensorDataId = res.body._id;
    expect(res.body).toHaveProperty('_id');
    expect(res.body.assetId).toBe('asset-123');
  });

  it('should fetch sensor data by ID', async () => {
    const res = await request(server)
      .get(`/api/mongo/sensor-data/${sensorDataId}`)
      .expect(200);
    
    expect(res.body).toHaveProperty('_id', sensorDataId);
  });

  it('should update sensor data by ID', async () => {
    const res = await request(server)
      .put(`/api/mongo/sensor-data/${sensorDataId}`)
      .send({ value: 27 })
      .expect(200);
    
    expect(res.body).toHaveProperty('value', 27);
  });

  it('should delete sensor data by ID', async () => {
    await request(server)
      .delete(`/api/mongo/sensor-data/${sensorDataId}`)
      .expect(200);
    
    await request(server)
      .get(`/api/mongo/sensor-data/${sensorDataId}`)
      .expect(404);
  });
});

describe('Event Log API', () => {
  let eventLogId: string;
  
  it('should create a new event log', async () => {
    const res = await request(server)
      .post('/api/mongo/event-logs')
      .send({
        eventType: 'sensor',
        source: 'sensor-123',
        message: 'Temperature reading',
      })
      .expect(201);
    
    eventLogId = res.body._id;
    expect(res.body).toHaveProperty('_id');
    expect(res.body.eventType).toBe('sensor');
  });

  it('should fetch event log by ID', async () => {
    const res = await request(server)
      .get(`/api/mongo/event-logs/${eventLogId}`)
      .expect(200);
    
    expect(res.body).toHaveProperty('_id', eventLogId);
  });

  it('should update event log by ID', async () => {
    const res = await request(server)
      .put(`/api/mongo/event-logs/${eventLogId}`)
      .send({ message: 'Updated message' })
      .expect(200);
    
    expect(res.body).toHaveProperty('message', 'Updated message');
  });

  it('should delete event log by ID', async () => {
    await request(server)
      .delete(`/api/mongo/event-logs/${eventLogId}`)
      .expect(200);
    
    await request(server)
      .get(`/api/mongo/event-logs/${eventLogId}`)
      .expect(404);
  });
});

describe('Chat Message API', () => {
  let messageId: string;
  
  it('should send a new chat message', async () => {
    const res = await request(server)
      .post('/api/mongo/chat/messages')
      .send({
        userId: 'user-123',
        username: 'JohnDoe',
        message: 'Hello, world!',
        roomId: 'room-123',
      })
      .expect(201);
    
    messageId = res.body._id;
    expect(res.body).toHaveProperty('_id');
    expect(res.body.message).toBe('Hello, world!');
  });

  it('should fetch chat messages for a room', async () => {
    const res = await request(server)
      .get('/api/mongo/chat/messages/room-123')
      .expect(200);
    
    expect(res.body).toBeInstanceOf(Array);
  });

  it('should delete a chat message', async () => {
    await request(server)
      .delete(`/api/mongo/chat/messages/${messageId}`)
      .expect(200);
    
    await request(server)
      .get(`/api/mongo/chat/messages/${messageId}`)
      .expect(404);
  });
});

describe('Checklist API', () => {
  let checklistId: string;
  
  it('should create a new checklist', async () => {
    const res = await request(server)
      .post('/api/mongo/checklists')
      .send({
        title: 'Safety Checklist',
        type: 'safety',
        items: [{ title: 'Check fire extinguisher', isCompleted: false }],
      })
      .expect(201);
    
    checklistId = res.body._id;
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toBe('Safety Checklist');
  });

  it('should fetch checklist by ID', async () => {
    const res = await request(server)
      .get(`/api/mongo/checklists/${checklistId}`)
      .expect(200);
    
    expect(res.body).toHaveProperty('_id', checklistId);
  });

  it('should update checklist by ID', async () => {
    const res = await request(server)
      .put(`/api/mongo/checklists/${checklistId}`)
      .send({ title: 'Updated Checklist' })
      .expect(200);
    
    expect(res.body).toHaveProperty('title', 'Updated Checklist');
  });

  it('should delete checklist by ID', async () => {
    await request(server)
      .delete(`/api/mongo/checklists/${checklistId}`)
      .expect(200);
    
    await request(server)
      .get(`/api/mongo/checklists/${checklistId}`)
      .expect(404);
  });
});