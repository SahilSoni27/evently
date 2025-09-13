"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const waitlistController_1 = require("../controllers/waitlistController");
const router = (0, express_1.Router)();
// All waitlist routes require authentication
router.use(auth_1.requireAuth);
// POST /api/events/:eventId/waitlist - Join event waitlist
router.post('/events/:eventId/waitlist', waitlistController_1.joinWaitlist);
// DELETE /api/events/:eventId/waitlist - Leave event waitlist
router.delete('/events/:eventId/waitlist', waitlistController_1.leaveWaitlist);
// GET /api/events/:eventId/waitlist - Get waitlist for event (admin only)
router.get('/events/:eventId/waitlist', waitlistController_1.getEventWaitlist);
// GET /api/users/:userId/waitlist - Get user's waitlist entries
router.get('/users/:userId/waitlist', waitlistController_1.getUserWaitlist);
// POST /api/admin/events/:eventId/waitlist/promote - Promote users from waitlist (admin only)
router.post('/admin/:eventId/waitlist/promote', waitlistController_1.promoteFromWaitlist);
exports.default = router;
