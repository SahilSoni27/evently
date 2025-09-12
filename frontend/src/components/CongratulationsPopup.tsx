'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CongratulationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  ticketCount: number;
  bookingId?: string;
  totalPrice: number;
}

export default function CongratulationsPopup({ 
  isOpen, 
  onClose, 
  eventName, 
  ticketCount, 
  bookingId, 
  totalPrice 
}: CongratulationsPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto close after 10 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center relative overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* Confetti Animation */}
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-yellow-400 rounded"
                      initial={{ 
                        x: Math.random() * 400 - 200, 
                        y: -20,
                        rotate: 0,
                        opacity: 1
                      }}
                      animate={{ 
                        y: 400,
                        rotate: 360,
                        opacity: 0
                      }}
                      transition={{ 
                        duration: 3,
                        delay: Math.random() * 2,
                        ease: "easeOut"
                      }}
                      style={{
                        backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#92400e'][Math.floor(Math.random() * 4)]
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", duration: 0.8 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <svg 
                  className="w-10 h-10 text-green-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>

              {/* Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  🎉 Congratulations!
                </h2>
                <p className="text-gray-800 mb-6">
                  {bookingId === 'PROCESSING' ? 
                    'Your seat booking is being processed! You will receive a confirmation shortly.' :
                    'Your booking has been confirmed successfully!'
                  }
                </p>

                {/* Booking Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold text-gray-800 mb-3">Booking Details:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Event:</span>
                      <span className="font-medium text-gray-800">{eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tickets:</span>
                      <span className="font-medium text-gray-800">
                        {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Paid:</span>
                      <span className="font-medium text-green-600">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {bookingId === 'PROCESSING' ? 'Job ID:' : 'Booking ID:'}
                      </span>
                      <span className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                        {bookingId ? (
                          bookingId === 'PROCESSING' ? 
                            'Processing...' : 
                            bookingId.substring(0, 8).toUpperCase()
                        ) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-2">📧 What's Next?</h4>
                  <p className="text-blue-700 text-sm">
                    A confirmation email with your ticket details and QR code has been sent to your email address.
                    You can also view and download your tickets from the "My Bookings" page.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.location.href = '/bookings'}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View My Tickets
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Continue Browsing
                  </button>
                </div>
              </motion.div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
