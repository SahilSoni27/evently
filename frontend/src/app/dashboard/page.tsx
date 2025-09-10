'use client';

import { useAuth } from '@/contexts/AuthContext';
import { withAuth } from '@/components/hoc/withAuth';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Event, Booking } from '@/types';
import Link from 'next/link';
import { Calendar, Users, DollarSign, CreditCard } from 'lucide-react';

function DashboardPage() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
      
      try {
        const [eventsResponse, bookingsResponse] = await Promise.all([
          apiClient.getEvents(),
          apiClient.getUserBookings(user.id)
        ]);
        
        // Extract events array from the API response
        const eventsData = (eventsResponse as any)?.data?.events || [];
        const bookingsData = (bookingsResponse as any)?.data?.bookings || [];
        
        setEvents(eventsData);
        setBookings(bookingsData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Set empty arrays on error to prevent filter issues
        setEvents([]);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  const upcomingEvents = events
    .filter(event => event?.startTime && new Date(event.startTime) > new Date())
    .slice(0, 3);

  const recentBookings = bookings
    .filter(booking => booking?.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/events"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Browse Events
              </Link>
              <Link
                href="/bookings"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                My Bookings
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Admin Panel
                </Link>
              )}
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${bookings
                    .filter(booking => booking?.totalPrice)
                    .reduce((sum, booking) => sum + parseFloat(booking.totalPrice || '0'), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => b.status === 'CONFIRMED').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Events */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Upcoming Events</h2>
            </div>
            <div className="p-6">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                        <span>{new Date(event.startTime).toLocaleDateString()}</span>
                        <span className="font-medium">${event.price}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No upcoming events</p>
              )}
              <div className="mt-4">
                <Link
                  href="/events"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  View all events →
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
            </div>
            <div className="p-6">
              {recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {booking.event.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.quantity} {booking.quantity === 1 ? 'ticket' : 'tickets'}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'CONFIRMED' 
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        ${parseFloat(booking.totalPrice).toFixed(2)} • {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No bookings yet</p>
              )}
              <div className="mt-4">
                <Link
                  href="/bookings"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  View all bookings →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(DashboardPage);
