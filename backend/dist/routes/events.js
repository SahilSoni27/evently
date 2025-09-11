"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// GET /api/events - List all events with pagination and search
router.get('/', (0, validation_1.validateQuery)(schemas_1.eventQuerySchema), eventController_1.getEvents);
// GET /api/events/stats - Get event statistics (Admin only)
router.get('/stats', auth_1.requireAuth, auth_1.requireAdmin, eventController_1.getEventStats);
// GET /api/events/:id - Get single event details
router.get('/:id', (0, validation_1.validateParams)(schemas_1.idParamSchema), eventController_1.getEventById);
// POST /api/events - Create new event (Admin only)
router.post('/', auth_1.requireAuth, auth_1.requireAdmin, (0, validation_1.validateBody)(schemas_1.createEventSchema), eventController_1.createEvent);
// PUT /api/events/:id - Update event (Admin only)
router.put('/:id', auth_1.requireAuth, auth_1.requireAdmin, (0, validation_1.validateParams)(schemas_1.idParamSchema), (0, validation_1.validateBody)(schemas_1.updateEventSchema), eventController_1.updateEvent);
// DELETE /api/events/:id - Delete event (Admin only)
router.delete('/:id', auth_1.requireAuth, auth_1.requireAdmin, (0, validation_1.validateParams)(schemas_1.idParamSchema), eventController_1.deleteEvent);
exports.default = router;
