'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { withAuth } from '@/components/hoc/withAuth';
import { apiClient } from '@/lib/api';
import { Booking } from '@/types';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { Calendar, MapPin, Users, CreditCard, AlertCircle } from 'lucide-react';

function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      if (!user?.id) return;
      
      try {
        const response = await apiClient.getUserBookings(user.id);
        setBookings(response.bookings || []);
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [user?.id]);

  const handleCancelBooking = async (bookingId: string) => {
    try {
      setCancellingId(bookingId);
      await apiClient.cancelBooking(bookingId);
      
      // Refresh bookings
      if (user?.id) {
        const response = await apiClient.getUserBookings(user.id);
        setBookings(response.bookings || []);
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isEventPast = (eventTime: string) => {
    return new Date(eventTime) < new Date();
  };

  const canCancelBooking = (booking: Booking) => {
    return booking.status === 'CONFIRMED' && !isEventPast(booking.event.startTime);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your bookings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <Navbar />
      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">View and manage your event bookings</p>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {booking.event.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                            <span>Booking #{booking.id.slice(-8).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span className="text-sm">{formatDate(booking.event.startTime)}</span>
                          </div>
                          {booking.event.endTime && (
                            <div className="flex items-center text-gray-600 ml-6">
                              <span className="text-xs">Ends: {formatDate(booking.event.endTime)}</span>
                            </div>
                          )}
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span className="text-sm">{booking.event.venue}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-2" />
                            <span className="text-sm">
                              {booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-600">
                            <CreditCard className="h-4 w-4 mr-2" />
                            <span className="text-sm font-medium">
                              ${formatPrice(booking.totalPrice)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Booked on {new Date(booking.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {isEventPast(booking.event.startTime) && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-md mb-4">
                          <AlertCircle className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">This event has already occurred</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 lg:mt-0 lg:ml-6 flex flex-col space-y-2">
                      <Link
                        href={`/events/${booking.event.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Event
                      </Link>
                      
                      {canCancelBooking(booking) && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={cancellingId === booking.id}
                          className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">
              Start exploring events and make your first booking!
            </p>
            <Link
              href="/events"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(BookingsPage);
