'use client';

import { useState, useEffect } from 'react';
import { withAdminAuth } from '@/components/hoc/withAuth';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import { SimpleBarChart, SimpleLineChart, MetricCard } from '@/components/analytics/Charts';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  MapPin,
  Trophy,
  Eye,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  overview: any;
  events: any;
  bookings: any;
  users: any;
  revenue: any;
}

function AdminAnalyticsPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadAnalytics();
    }
  }, [timeframe, isAuthenticated, isAdmin]);

  const loadAnalytics = async () => {
    if (!isAuthenticated || !isAdmin) {
      setError('Authentication required. Please log in as admin.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // Test basic connectivity first
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/test`);
      if (!testResponse.ok) {
        throw new Error('Backend server is not responding');
      }
      
      console.log('Connection test passed');
      
      // Debug: Check if we have a valid token
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);
      console.log('Token length:', token?.length);
      
      // Test direct fetch to analytics endpoint
      try {
        const directTest = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/admin/analytics/overview`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Direct analytics fetch status:', directTest.status);
        if (!directTest.ok) {
          const errorText = await directTest.text();
          console.error('Direct analytics fetch error:', errorText);
        } else {
          const result = await directTest.json();
          console.log('Direct analytics fetch success:', result);
        }
      } catch (directError) {
        console.error('Direct analytics fetch failed:', directError);
      }
      
      console.log('Making analytics API calls...');
      
      const [overview, events, bookings, users, revenue] = await Promise.all([
        apiClient.getAnalyticsOverview().catch(err => {
          console.error('Overview API failed:', err);
          throw err;
        }),
        apiClient.getEventAnalytics(timeframe, 10).catch(err => {
          console.error('Events API failed:', err);
          throw err;
        }),
        apiClient.getBookingAnalytics(timeframe).catch(err => {
          console.error('Bookings API failed:', err);
          throw err;
        }),
        apiClient.getUserAnalytics(timeframe).catch(err => {
          console.error('Users API failed:', err);
          throw err;
        }),
        apiClient.getRevenueAnalytics(timeframe).catch(err => {
          console.error('Revenue API failed:', err);
          throw err;
        })
      ]);
      
      console.log('All analytics API calls completed successfully');

      setData({
        overview: (overview as any).data,
        events: (events as any).data,
        bookings: (bookings as any).data,
        users: (users as any).data,
        revenue: (revenue as any).data
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      
      let errorMessage = 'Failed to load analytics data. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to the server. Please check if the backend is running on http://localhost:4000';
        } else if (error.message.includes('403')) {
          errorMessage = 'Access denied. Admin privileges required.';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.message.includes('429') || error.message.includes('Too many requests')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('Backend server is not responding')) {
          errorMessage = 'Backend server is not responding. Please check if it\'s running.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const testConnection = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/test`);
      const data = await response.json();
      alert(`Connection test: ${data.message}`);
    } catch (error) {
      alert(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportData = () => {
    if (!data) return;
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      timeframe,
      overview: data.overview,
      events: data.events,
      bookings: data.bookings,
      users: data.users,
      revenue: data.revenue
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evently-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Analytics</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="space-x-2">
                <button
                  onClick={loadAnalytics}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
                <button
                  onClick={testConnection}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Test Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="pt-20 bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Analytics</h1>
              <p className="text-gray-600">Comprehensive insights and performance metrics</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Export Button */}
              <button
                onClick={handleExportData}
                disabled={!data}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {/* Timeframe Selector */}
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: Activity },
                { id: 'events', name: 'Events', icon: Calendar },
                { id: 'bookings', name: 'Bookings', icon: Users },
                { id: 'revenue', name: 'Revenue', icon: DollarSign },
                { id: 'users', name: 'Users', icon: Trophy }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <OverviewTab data={data?.overview} />
        )}
        {activeTab === 'events' && (
          <EventsTab data={data?.events} formatDate={formatDate} />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab data={data?.bookings} formatDate={formatDate} formatCurrency={formatCurrency} />
        )}
        {activeTab === 'revenue' && (
          <RevenueTab data={data?.revenue} formatDate={formatDate} formatCurrency={formatCurrency} />
        )}
        {activeTab === 'users' && (
          <UsersTab data={data?.users} formatCurrency={formatCurrency} />
        )}
      </main>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data }: { data: any }) {
  if (!data?.stats) return <div>No overview data available</div>;

  const { stats } = data;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Events"
          value={stats.totalEvents}
          icon={<Calendar className="h-6 w-6" />}
          color="blue"
        />
        
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-6 w-6" />}
          color="green"
        />
        
        <MetricCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
        
        <MetricCard
          title="Active Events"
          value={stats.activeEvents}
          icon={<Activity className="h-6 w-6" />}
          color="orange"
        />
        
        <MetricCard
          title="Upcoming Events"
          value={stats.upcomingEvents}
          icon={<Calendar className="h-6 w-6" />}
          color="indigo"
        />
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Avg Bookings per Event</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalEvents > 0 ? (stats.totalBookings / stats.totalEvents).toFixed(1) : '0'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Avg Bookings per User</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.totalUsers > 0 ? (stats.totalBookings / stats.totalUsers).toFixed(1) : '0'}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
            
            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Event Utilization Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalEvents > 0 ? Math.round((stats.activeEvents / stats.totalEvents) * 100) : 0}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API Status</span>
              <span className="flex items-center text-green-600 font-medium">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database</span>
              <span className="flex items-center text-green-600 font-medium">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Analytics</span>
              <span className="flex items-center text-green-600 font-medium">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Event System</span>
              <span className="flex items-center text-green-600 font-medium">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <a
            href="/admin/events/create"
            className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Create Event
          </a>
          <a
            href="/admin/events"
            className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Eye className="h-5 w-5 mr-2" />
            Manage Events
          </a>
          <a
            href="/admin/bookings"
            className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Users className="h-5 w-5 mr-2" />
            View Bookings
          </a>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Events Tab Component
function EventsTab({ data, formatDate }: { data: any; formatDate: (date: string) => string }) {
  if (!data?.events) return <div>No event data available</div>;

  return (
    <div className="space-y-6">
      {/* Events Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Event Performance</h3>
          <p className="text-sm text-gray-600">Events from the selected timeframe</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fill Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.events.map((event: any) => {
                const fillRate = event.capacity > 0 ? (event.totalBookings / event.capacity) * 100 : 0;
                return (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{event.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {event.venue}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(event.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${parseFloat(event.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.capacity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.totalBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(fillRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">{fillRate.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Bookings Tab Component  
function BookingsTab({ data, formatDate, formatCurrency }: { 
  data: any; 
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
}) {
  if (!data) return <div>No booking data available</div>;

  // Prepare chart data
  const bookingTrendsData = data.dailyTrends?.map((day: any) => ({
    label: formatDate(day.date),
    value: day.bookings
  })) || [];

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Bookings"
          value={data.totalBookings || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        
        <MetricCard
          title="Daily Average"
          value={data.dailyTrends?.length > 0 ? 
            Math.round(data.totalBookings / data.dailyTrends.length) : 0}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        
        <MetricCard
          title="Peak Day"
          value={data.dailyTrends?.length > 0 ? 
            Math.max(...data.dailyTrends.map((d: any) => d.bookings)) : 0}
          icon={<Calendar className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Daily Trends Chart */}
      {bookingTrendsData.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <SimpleLineChart
            data={bookingTrendsData}
            title="Daily Booking Trends"
            color="blue"
            className="p-6"
          />
        </div>
      )}

      {/* Recent Bookings */}
      {data.recentBookings && data.recentBookings.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
            <p className="text-sm text-gray-600">Latest {data.recentBookings.length} bookings</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentBookings.map((booking: any) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.event.name}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {booking.event.venue}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.user.name}</div>
                      <div className="text-sm text-gray-500">{booking.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {booking.quantity} ticket{booking.quantity !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(booking.totalPrice))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(booking.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'CONFIRMED' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Revenue Tab Component
function RevenueTab({ data, formatDate, formatCurrency }: { 
  data: any; 
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
}) {
  if (!data) return <div>No revenue data available</div>;

  // Prepare chart data
  const revenueChartData = data.dailyRevenue?.map((day: any) => ({
    label: formatDate(day.date),
    value: day.revenue
  })) || [];

  const venueChartData = data.revenueByVenue?.slice(0, 8).map((venue: any) => ({
    label: venue.venue.length > 15 ? venue.venue.substring(0, 15) + '...' : venue.venue,
    value: venue.revenue,
    color: 'bg-green-500'
  })) || [];

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.totalRevenue || 0)}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
        />
        
        <MetricCard
          title="Total Bookings"
          value={data.totalBookings || 0}
          icon={<Users className="h-6 w-6" />}
          color="blue"
        />
        
        <MetricCard
          title="Avg Revenue/Booking"
          value={formatCurrency(data.totalBookings > 0 ? data.totalRevenue / data.totalBookings : 0)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        {revenueChartData.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <SimpleLineChart
              data={revenueChartData}
              title="Daily Revenue Trend"
              color="green"
              className="p-6"
            />
          </div>
        )}

        {/* Revenue by Venue Chart */}
        {venueChartData.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <SimpleBarChart
              data={venueChartData}
              title="Revenue by Venue"
              className="p-6"
            />
          </div>
        )}
      </div>

      {/* Detailed Revenue Table */}
      {data.dailyRevenue && data.dailyRevenue.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Daily Revenue Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg per Booking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.dailyRevenue.map((day: any) => {
                  const percentage = data.totalRevenue > 0 ? (day.revenue / data.totalRevenue) * 100 : 0;
                  const avgPerBooking = day.bookings > 0 ? day.revenue / day.bookings : 0;
                  
                  return (
                    <tr key={day.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(day.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(avgPerBooking)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-20">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Users Tab Component
function UsersTab({ data, formatCurrency }: { 
  data: any; 
  formatCurrency: (amount: number) => string;
}) {
  if (!data) return <div>No user data available</div>;

  return (
    <div className="space-y-6">
      {/* Top Users */}
      {data.topUsers && data.topUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Users by Spending</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.topUsers.map((user: any, index: number) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.totalBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.totalTickets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(user.totalSpent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Registrations */}
      {data.recentRegistrations && data.recentRegistrations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent User Registrations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.recentRegistrations.map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAdminAuth(AdminAnalyticsPage);
