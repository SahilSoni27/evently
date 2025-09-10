'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types';
import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { Calendar, MapPin, Users, ArrowLeft, CreditCard, Info, Tag, Clock, DollarSign } from 'lucide-react';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const eventId = params.id as string;

  const getCategoryColor = (category: string) => {
    const colors = {
      CONFERENCE: 'bg-blue-100 text-blue-800',
      WORKSHOP: 'bg-green-100 text-green-800',
      NETWORKING: 'bg-purple-100 text-purple-800',
      SOCIAL: 'bg-pink-100 text-pink-800',
      BUSINESS: 'bg-gray-100 text-gray-800',
      ENTERTAINMENT: 'bg-yellow-100 text-yellow-800',
      SPORTS: 'bg-orange-100 text-orange-800',
      EDUCATION: 'bg-indigo-100 text-indigo-800',
      CULTURAL: 'bg-red-100 text-red-800',
      OTHER: 'bg-gray-100 text-gray-600'
    };
    return colors[category as keyof typeof colors] || colors.OTHER;
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? 'Free' : numPrice.toFixed(2);
  };

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const response = await apiClient.getEvent(eventId);
        const eventData = (response as any)?.data?.event || response;
        setEvent(eventData);
      } catch (error) {
        console.error('Failed to load event:', error);
        setError('Event not found');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const handleBooking = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!event || quantity <= 0) {
      setError('Invalid booking details');
      return;
    }

    if (quantity > event.availableCapacity) {
      setError(`Only ${event.availableCapacity} tickets available`);
      return;
    }

    setBookingLoading(true);
    setError('');
    setSuccess('');

    try {
      const bookingData = {
        eventId: event.id,
        quantity,
        totalPrice: (parseFloat(event.price) * quantity).toFixed(2)
      };

      const response = await apiClient.createBooking(bookingData);
      
      if (response) {
        setSuccess(`Successfully booked ${quantity} ticket(s)!`);
        setQuantity(1);
        
        // Refresh event data to update available capacity
        const updatedResponse = await apiClient.getEvent(eventId);
        const updatedEvent = (updatedResponse as any)?.data?.event || updatedResponse;
        setEvent(updatedEvent);

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPrice = event ? (parseFloat(event.price) * quantity).toFixed(2) : '0.00';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading event details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
            <Link
              href="/events"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/events"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Event Image */}
          {event.imageUrl && (
            <div className="w-full h-64 md:h-80">
              <img
                src={event.imageUrl}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Event Header */}
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {event.name}
                </h1>

                {/* Category and Tags */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {event.category && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(event.category)}`}>
                      {event.category}
                    </span>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-5 w-5 mr-3" />
                    <span className="text-lg">{formatDate(event.startTime)}</span>
                  </div>
                  {event.endTime && (
                    <div className="flex items-center text-gray-600 ml-8">
                      <span className="text-sm">Ends: {formatDate(event.endTime)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-5 w-5 mr-3" />
                    <span className="text-lg">{event.venue}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="h-5 w-5 mr-3" />
                    <span className="text-lg">
                      {event.availableCapacity} of {event.capacity} spots available
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-3xl font-bold text-blue-600">
                    ${formatPrice(event.price)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.availableCapacity > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {event.availableCapacity > 0 ? 'Available' : 'Sold Out'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Description */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
            <div className="text-gray-700 leading-relaxed">
              {event.description ? (
                <p>{event.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description available for this event.</p>
              )}
            </div>
          </div>

          {/* Booking Section */}
          {event.availableCapacity > 0 && (
            <div className="px-6 py-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Book Your Tickets</h2>
              
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 text-green-600 mr-2" />
                    <p className="text-green-600">{success}</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Tickets
                    </label>
                    <select
                      id="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={bookingLoading}
                    >
                      {Array.from({ length: Math.min(event.availableCapacity, 10) }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'ticket' : 'tickets'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Order Summary</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Price per ticket:</span>
                        <span>${formatPrice(event.price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Quantity:</span>
                        <span>{quantity}</span>
                      </div>
                      <div className="border-t pt-1 mt-2">
                        <div className="flex justify-between font-semibold">
                          <span>Total:</span>
                          <span>${totalPrice}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                  {isAuthenticated ? (
                    <button
                      onClick={handleBooking}
                      disabled={bookingLoading}
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      {bookingLoading ? 'Processing...' : `Book ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                    >
                      Sign In to Book
                    </Link>
                  )}
                </div>

                {isAuthenticated && (
                  <div className="mt-4 text-xs text-gray-500">
                    <Info className="h-4 w-4 inline mr-1" />
                    Your booking will be confirmed immediately and you'll receive a confirmation email.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sold Out Message */}
          {event.availableCapacity === 0 && (
            <div className="px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Event Sold Out</h3>
                <p className="text-red-600">
                  This event has reached its capacity. Check back later or explore other events.
                </p>
                <Link
                  href="/events"
                  className="inline-flex items-center px-4 py-2 mt-4 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Browse Other Events
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
