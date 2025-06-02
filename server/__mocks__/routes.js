// Mock routes file for testing
import type { Express } from "express";
import { storage } from "./storage.js";
import { authorizeRoles } from './authMiddleware.js';

export async function registerRoutes(app: Express) {
  // Set up asset routes with RBAC
  
  // GET /api/assets - Get all assets
  app.get('/api/assets', authorizeRoles('admin', 'supervisor', 'technician', 'operator'), async (req, res) => {
    try {
      const assets = await storage.assets.findMany();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching assets' });
    }
  });
  
  // POST /api/assets - Create a new asset
  app.post('/api/assets', authorizeRoles('admin', 'supervisor'), async (req, res) => {
    try {
      const asset = await storage.assets.create(req.body);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ message: 'Error creating asset' });
    }
  });
  
  // GET /api/assets/:id - Get a single asset
  app.get('/api/assets/:id', authorizeRoles('admin', 'supervisor', 'technician', 'operator'), async (req, res) => {
    try {
      const asset = await storage.assets.findById(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching asset' });
    }
  });
  
  // PUT /api/assets/:id - Update an asset
  app.put('/api/assets/:id', authorizeRoles('admin', 'supervisor'), async (req, res) => {
    try {
      const asset = await storage.assets.update(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }
      res.json(asset);
    } catch (error) {
      res.status(400).json({ message: 'Error updating asset' });
    }
  });
  
  // DELETE /api/assets/:id - Delete an asset
  app.delete('/api/assets/:id', authorizeRoles('admin'), async (req, res) => {
    try {
      const success = await storage.assets.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Asset not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting asset' });
    }
  });
  
  return app;
}
