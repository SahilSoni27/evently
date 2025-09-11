"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketService = void 0;
const qrcode_1 = __importDefault(require("qrcode"));
const jspdf_1 = require("jspdf");
const prisma_1 = __importDefault(require("../lib/prisma"));
class TicketService {
    /**
     * Generate QR code for a booking
     */
    static async generateQRCode(bookingId) {
        try {
            // Create QR code data with booking verification URL
            const qrData = {
                bookingId,
                timestamp: Date.now(),
                checkInUrl: `${process.env.API_URL}/api/tickets/verify/${bookingId}`
            };
            // Generate QR code as data URL
            const qrCodeDataURL = await qrcode_1.default.toDataURL(JSON.stringify(qrData), {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            return qrCodeDataURL;
        }
        catch (error) {
            console.error('QR code generation failed:', error);
            throw new Error('Failed to generate QR code');
        }
    }
    /**
     * Generate ticket data for PDF
     */
    static async getTicketData(bookingId) {
        try {
            const booking = await prisma_1.default.booking.findUnique({
                where: { id: bookingId },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    event: {
                        select: {
                            name: true,
                            venue: true,
                            startTime: true,
                            endTime: true,
                            price: true
                        }
                    }
                }
            });
            if (!booking || booking.status !== 'CONFIRMED') {
                return null;
            }
            const qrCodeData = await this.generateQRCode(bookingId);
            return {
                bookingId: booking.id,
                eventName: booking.event.name,
                userName: booking.user.name || 'Guest',
                venue: booking.event.venue,
                eventDate: booking.event.startTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                eventTime: booking.event.startTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                ticketQuantity: booking.quantity,
                totalPrice: Number(booking.totalPrice),
                qrCodeData
            };
        }
        catch (error) {
            console.error('Get ticket data failed:', error);
            return null;
        }
    }
    /**
     * Generate PDF ticket
     */
    static async generatePDFTicket(bookingId) {
        try {
            const ticketData = await this.getTicketData(bookingId);
            if (!ticketData) {
                return null;
            }
            const pdf = new jspdf_1.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            // Set font
            pdf.setFont('helvetica');
            // Header - Event name
            pdf.setFontSize(24);
            pdf.setTextColor(67, 56, 202); // Indigo color
            pdf.text(ticketData.eventName, 20, 30);
            // Divider line
            pdf.setLineWidth(0.5);
            pdf.setDrawColor(229, 231, 235);
            pdf.line(20, 35, 190, 35);
            // Ticket label
            pdf.setFontSize(18);
            pdf.setTextColor(0, 0, 0);
            pdf.text('🎫 EVENT TICKET', 20, 50);
            // Booking details
            pdf.setFontSize(12);
            pdf.setTextColor(75, 85, 99);
            const details = [
                ['Ticket Holder:', ticketData.userName],
                ['Event:', ticketData.eventName],
                ['Venue:', ticketData.venue],
                ['Date:', ticketData.eventDate],
                ['Time:', ticketData.eventTime],
                ['Quantity:', ticketData.ticketQuantity.toString()],
                ['Total Paid:', `$${ticketData.totalPrice.toFixed(2)}`],
                ['Booking ID:', ticketData.bookingId]
            ];
            let yPosition = 65;
            details.forEach(([label, value]) => {
                pdf.setTextColor(75, 85, 99);
                pdf.text(label, 20, yPosition);
                pdf.setTextColor(0, 0, 0);
                pdf.text(value, 70, yPosition);
                yPosition += 8;
            });
            // QR Code section
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            pdf.text('Scan for Check-in:', 20, yPosition + 15);
            // Add QR code image
            const qrSize = 40;
            pdf.addImage(ticketData.qrCodeData, 'PNG', 20, yPosition + 20, qrSize, qrSize);
            // Instructions
            pdf.setFontSize(10);
            pdf.setTextColor(107, 114, 128);
            pdf.text('Present this QR code at the event entrance for check-in.', 70, yPosition + 35);
            pdf.text('Keep this ticket safe and arrive 15 minutes early.', 70, yPosition + 42);
            // Footer
            pdf.setFontSize(8);
            pdf.setTextColor(156, 163, 175);
            pdf.text('Generated by Evently Event Management System', 20, 280);
            pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 285);
            // Border
            pdf.setLineWidth(1);
            pdf.setDrawColor(229, 231, 235);
            pdf.rect(15, 15, 180, 260);
            // Return PDF as buffer
            const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
            return pdfBuffer;
        }
        catch (error) {
            console.error('PDF generation failed:', error);
            return null;
        }
    }
    /**
     * Verify QR code for check-in
     */
    static async verifyTicket(bookingId) {
        try {
            const booking = await prisma_1.default.booking.findUnique({
                where: { id: bookingId },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    event: {
                        select: {
                            name: true,
                            venue: true,
                            startTime: true,
                            endTime: true
                        }
                    }
                }
            });
            if (!booking) {
                return {
                    valid: false,
                    message: 'Booking not found'
                };
            }
            if (booking.status !== 'CONFIRMED') {
                return {
                    valid: false,
                    message: 'Booking is not confirmed'
                };
            }
            const now = new Date();
            const eventStart = booking.event.startTime;
            const eventEnd = booking.event.endTime;
            // Check if event has started (allow check-in 2 hours before)
            const checkInAllowedTime = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000);
            if (now < checkInAllowedTime) {
                return {
                    valid: false,
                    message: 'Check-in not yet available. Please arrive closer to event time.'
                };
            }
            // Check if event has ended
            if (eventEnd && now > eventEnd) {
                return {
                    valid: false,
                    message: 'Event has already ended'
                };
            }
            return {
                valid: true,
                booking,
                message: 'Ticket verified successfully'
            };
        }
        catch (error) {
            console.error('Ticket verification failed:', error);
            return {
                valid: false,
                message: 'Verification failed'
            };
        }
    }
    /**
     * Record check-in
     */
    static async checkInTicket(bookingId) {
        try {
            // Update booking with check-in timestamp
            await prisma_1.default.booking.update({
                where: { id: bookingId },
                data: {
                    updatedAt: new Date()
                    // Note: You might want to add a checkedInAt field to the schema
                }
            });
            console.log(`✅ Ticket checked in: ${bookingId}`);
            return true;
        }
        catch (error) {
            console.error('Check-in recording failed:', error);
            return false;
        }
    }
}
exports.TicketService = TicketService;
