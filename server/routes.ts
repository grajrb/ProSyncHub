import type { Express } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertAssetSchema, insertWorkOrderSchema, insertMaintenanceScheduleSchema, insertNotificationSchema, insertAssetSensorReadingSchema } from "@shared/schema";
import { z } from "zod";

/**
 * @openapi
 * /api/assets:
 *   get:
 *     summary: Get a list of assets
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Filter by location ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by asset status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of assets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Asset'
 *   post:
 *     summary: Create a new asset
 *     tags:
 *       - Assets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       201:
 *         description: Asset created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Invalid asset data
 *
 * /api/assets/{id}:
 *   get:
 *     summary: Get asset by ID
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       404:
 *         description: Asset not found
 *   put:
 *     summary: Update asset by ID
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssetInput'
 *     responses:
 *       200:
 *         description: Asset updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Asset'
 *       400:
 *         description: Invalid asset data
 *       404:
 *         description: Asset not found
 *   delete:
 *     summary: Delete asset by ID
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Asset ID
 *     responses:
 *       204:
 *         description: Asset deleted
 *       404:
 *         description: Asset not found
 *
 * components:
 *   schemas:
 *     Asset:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         assetTag:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         model:
 *           type: string
 *         manufacturer:
 *           type: string
 *         serialNumber:
 *           type: string
 *         installationDate:
 *           type: string
 *           format: date
 *         locationId:
 *           type: integer
 *         assetTypeId:
 *           type: integer
 *         parentAssetId:
 *           type: integer
 *           nullable: true
 *         documentationUrl:
 *           type: string
 *         qrCodePath:
 *           type: string
 *         currentStatus:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     AssetInput:
 *       type: object
 *       properties:
 *         assetTag:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         model:
 *           type: string
 *         manufacturer:
 *           type: string
 *         serialNumber:
 *           type: string
 *         installationDate:
 *           type: string
 *           format: date
 *         locationId:
 *           type: integer
 *         assetTypeId:
 *           type: integer
 *         parentAssetId:
 *           type: integer
 *           nullable: true
 *         documentationUrl:
 *           type: string
 *         qrCodePath:
 *           type: string
 *         currentStatus:
 *           type: string
 */
