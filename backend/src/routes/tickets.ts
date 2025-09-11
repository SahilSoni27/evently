import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  downloadTicket,
  getQRCode,
  verifyTicket,
  checkInTicket,
  getTicketDetails
} from '../controllers/ticketController';

const router = Router();

// User ticket routes (require authentication)
router.get('/:bookingId/download', requireAuth, downloadTicket);
router.get('/:bookingId/qr', requireAuth, getQRCode);
router.get('/:bookingId/details', requireAuth, getTicketDetails);

// Admin/verification routes (can be used by event organizers)
router.get('/verify/:bookingId', requireAuth, verifyTicket);
router.post('/checkin/:bookingId', requireAuth, checkInTicket);

export default router;
