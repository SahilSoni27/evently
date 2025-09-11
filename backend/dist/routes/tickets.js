"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const ticketController_1 = require("../controllers/ticketController");
const router = (0, express_1.Router)();
// User ticket routes (require authentication)
router.get('/:bookingId/download', auth_1.requireAuth, ticketController_1.downloadTicket);
router.get('/:bookingId/qr', auth_1.requireAuth, ticketController_1.getQRCode);
router.get('/:bookingId/details', auth_1.requireAuth, ticketController_1.getTicketDetails);
// Admin/verification routes (can be used by event organizers)
router.get('/verify/:bookingId', auth_1.requireAuth, ticketController_1.verifyTicket);
router.post('/checkin/:bookingId', auth_1.requireAuth, ticketController_1.checkInTicket);
exports.default = router;
