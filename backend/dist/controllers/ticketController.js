"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTicketDetails = exports.checkInTicket = exports.verifyTicket = exports.getQRCode = exports.downloadTicket = void 0;
const ticketService_1 = require("../services/ticketService");
const prisma_1 = __importDefault(require("../lib/prisma"));
// GET /api/tickets/:bookingId - Download ticket PDF
const downloadTicket = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        // Verify user owns this booking or is admin
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: {
                user: {
                    select: { id: true }
                },
                event: {
                    select: { name: true }
                }
            }
        });
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }
        if (booking.user.id !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }
        if (booking.status !== 'CONFIRMED') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot generate ticket for unconfirmed booking'
            });
        }
        const pdfBuffer = await ticketService_1.TicketService.generatePDFTicket(bookingId);
        if (!pdfBuffer) {
            return res.status(500).json({
                status: 'error',
                message: 'Failed to generate ticket'
            });
        }
        // Set headers for PDF download
        const fileName = `ticket-${booking.event.name.replace(/[^a-zA-Z0-9]/g, '_')}-${bookingId}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Download ticket error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to download ticket'
        });
    }
};
exports.downloadTicket = downloadTicket;
// GET /api/tickets/:bookingId/qr - Get QR code for ticket
const getQRCode = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        // Verify user owns this booking or is admin
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                status: true,
                userId: true
            }
        });
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }
        if (booking.userId !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }
        if (booking.status !== 'CONFIRMED') {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot generate QR code for unconfirmed booking'
            });
        }
        const qrCodeDataURL = await ticketService_1.TicketService.generateQRCode(bookingId);
        res.json({
            status: 'success',
            data: {
                bookingId,
                qrCode: qrCodeDataURL
            }
        });
    }
    catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate QR code'
        });
    }
};
exports.getQRCode = getQRCode;
// GET /api/tickets/verify/:bookingId - Verify ticket (for check-in)
const verifyTicket = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const verification = await ticketService_1.TicketService.verifyTicket(bookingId);
        if (!verification.valid) {
            return res.status(400).json({
                status: 'error',
                message: verification.message
            });
        }
        res.json({
            status: 'success',
            message: verification.message,
            data: {
                booking: {
                    id: verification.booking.id,
                    quantity: verification.booking.quantity,
                    event: verification.booking.event,
                    user: verification.booking.user
                }
            }
        });
    }
    catch (error) {
        console.error('Verify ticket error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ticket verification failed'
        });
    }
};
exports.verifyTicket = verifyTicket;
// POST /api/tickets/checkin/:bookingId - Check in ticket
const checkInTicket = async (req, res) => {
    try {
        const { bookingId } = req.params;
        // First verify the ticket
        const verification = await ticketService_1.TicketService.verifyTicket(bookingId);
        if (!verification.valid) {
            return res.status(400).json({
                status: 'error',
                message: verification.message
            });
        }
        // Record check-in
        const checkedIn = await ticketService_1.TicketService.checkInTicket(bookingId);
        if (!checkedIn) {
            return res.status(500).json({
                status: 'error',
                message: 'Failed to record check-in'
            });
        }
        res.json({
            status: 'success',
            message: 'Check-in successful',
            data: {
                booking: verification.booking,
                checkedInAt: new Date()
            }
        });
    }
    catch (error) {
        console.error('Check-in ticket error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Check-in failed'
        });
    }
};
exports.checkInTicket = checkInTicket;
// GET /api/tickets/booking/:bookingId - Get ticket details
const getTicketDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        // Verify user owns this booking or is admin
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                status: true,
                userId: true
            }
        });
        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Booking not found'
            });
        }
        if (booking.userId !== userId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied'
            });
        }
        const ticketData = await ticketService_1.TicketService.getTicketData(bookingId);
        if (!ticketData) {
            return res.status(404).json({
                status: 'error',
                message: 'Ticket data not found'
            });
        }
        res.json({
            status: 'success',
            data: ticketData
        });
    }
    catch (error) {
        console.error('Get ticket details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get ticket details'
        });
    }
};
exports.getTicketDetails = getTicketDetails;
