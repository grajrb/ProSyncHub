// Jest mock for AssetSensorData model
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// Export a fully functional mock
const AssetSensorData = {
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  create: jest.fn().mockImplementation((data) => Promise.resolve({
    ...data,
    _id: new mongoose.Types.ObjectId().toString()
  })),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
  }),
  findOne: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null)
  }),
  findById: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null)
  }),
  updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
};

export default AssetSensorData;
