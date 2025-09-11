"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const notificationController_1 = require("../controllers/notificationController");
const notificationHistoryController_1 = require("../controllers/notificationHistoryController");
const router = (0, express_1.Router)();
// Public route - get VAPID key for client-side subscription
router.get('/vapid-key', notificationController_1.getVapidKey);
// Authenticated routes
router.post('/subscribe', auth_1.requireAuth, notificationController_1.subscribe);
router.post('/unsubscribe', auth_1.requireAuth, notificationController_1.unsubscribe);
router.get('/status', auth_1.requireAuth, notificationHistoryController_1.getNotificationStatus);
// Notification history routes
router.get('/user/:userId', auth_1.requireAuth, notificationHistoryController_1.getUserNotifications);
router.post('/mark-read/:notificationId', auth_1.requireAuth, notificationHistoryController_1.markNotificationAsRead);
// Admin routes
router.post('/test', auth_1.requireAuth, notificationController_1.sendTestNotification);
router.post('/event/:eventId/reminder', auth_1.requireAuth, notificationController_1.sendEventReminder);
exports.default = router;
