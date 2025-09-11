'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { withAdminAuth } from '@/components/hoc/withAdminAuth';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Zap
} from 'lucide-react';

interface AnalyticsOverview {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  activeUsers: number;
}

interface EventAnalytics {
  eventsByCategory: Array<{ category: string; count: number }>;
  topEvents: Array<{ id: string; name: string; bookings: number }>;
}

interface BookingAnalytics {
  bookingsByStatus: Array<{ status: string; count: number }>;
  bookingsByMonth: Array<{ month: string; count: number }>;
}

interface UserAnalytics {
  usersByMonth: Array<{ month: string; count: number }>;
  userActivity: Array<{ date: string; activeUsers: number }>;
}

interface RevenueAnalytics {
  revenueByMonth: Array<{ month: string; revenue: number }>;
  revenueByCategory: Array<{ category: string; revenue: number }>;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  events: EventAnalytics;
  bookings: BookingAnalytics;
  users: UserAnalytics;
  revenue: RevenueAnalytics;
}

function AdminAnalyticsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!isAuthenticated || !isAdmin) {
      setError('Authentication required. Please log in as admin.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Mock data for demonstration since we don't have analytics API endpoint
      const mockData: AnalyticsData = {
        overview: {
          totalEvents: 42,
          totalBookings: 234,
          totalRevenue: 15670,
          totalUsers: 156,
          activeUsers: 89
        },
        events: {
          eventsByCategory: [
            { category: 'CONFERENCE', count: 15 },
            { category: 'WORKSHOP', count: 12 },
            { category: 'NETWORKING', count: 8 },
            { category: 'SOCIAL', count: 5 },
            { category: 'OTHER', count: 2 }
          ],
          topEvents: [
            { id: '1', name: 'Tech Conference 2024', bookings: 89 },
            { id: '2', name: 'React Workshop', bookings: 67 },
            { id: '3', name: 'Networking Mixer', bookings: 45 }
          ]
        },
        bookings: {
          bookingsByStatus: [
            { status: 'CONFIRMED', count: 198 },
            { status: 'PENDING', count: 23 },
            { status: 'CANCELLED', count: 13 }
          ],
          bookingsByMonth: [
            { month: 'Jan 2024', count: 45 },
            { month: 'Feb 2024', count: 67 },
            { month: 'Mar 2024', count: 89 },
            { month: 'Apr 2024', count: 33 }
          ]
        },
        users: {
          usersByMonth: [
            { month: 'Jan 2024', count: 23 },
            { month: 'Feb 2024', count: 34 },
            { month: 'Mar 2024', count: 56 },
            { month: 'Apr 2024', count: 43 }
          ],
          userActivity: [
            { date: '2024-04-01', activeUsers: 12 },
            { date: '2024-04-02', activeUsers: 18 },
            { date: '2024-04-03', activeUsers: 25 }
          ]
        },
        revenue: {
          revenueByMonth: [
            { month: 'Jan 2024', revenue: 3450 },
            { month: 'Feb 2024', revenue: 4560 },
            { month: 'Mar 2024', revenue: 5670 },
            { month: 'Apr 2024', revenue: 1990 }
          ],
          revenueByCategory: [
            { category: 'CONFERENCE', revenue: 8900 },
            { category: 'WORKSHOP', revenue: 4500 },
            { category: 'NETWORKING', revenue: 1800 },
            { category: 'SOCIAL', revenue: 470 }
          ]
        }
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadAnalytics();
    }
  }, [timeframe, isAuthenticated, isAdmin]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExportData = () => {
    if (!data) return;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      timeframe,
      ...data
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evently-analytics-${timeframe}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin privileges required to view analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const StatCard = ({ title, value, icon: Icon, change }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    change?: string;
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-indigo-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-medium text-gray-900">{value}</dd>
            {change && (
              <dd className="text-sm text-green-600">{change}</dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Overview of your event management platform performance
              </p>
            </div>
            <div className="flex space-x-3">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button
                onClick={handleExportData}
                className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {data && (
          <div className="px-4 sm:px-0">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
              <StatCard
                title="Total Events"
                value={data.overview.totalEvents}
                icon={Calendar}
                change="+12% from last month"
              />
              <StatCard
                title="Total Bookings"
                value={data.overview.totalBookings}
                icon={BarChart3}
                change="+8% from last month"
              />
              <StatCard
                title="Total Revenue"
                value={formatCurrency(data.overview.totalRevenue)}
                icon={DollarSign}
                change="+15% from last month"
              />
              <StatCard
                title="Total Users"
                value={data.overview.totalUsers}
                icon={Users}
                change="+5% from last month"
              />
              <StatCard
                title="Active Users"
                value={data.overview.activeUsers}
                icon={Activity}
                change="+3% from last month"
              />
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <nav className="flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'overview', name: 'Overview', icon: BarChart3 },
                  { id: 'events', name: 'Events', icon: Calendar },
                  { id: 'bookings', name: 'Bookings', icon: FileText },
                  { id: 'users', name: 'Users', icon: Users },
                  { id: 'revenue', name: 'Revenue', icon: DollarSign },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white shadow rounded-lg">
              {activeTab === 'overview' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Platform Overview</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Events by Category</h4>
                      <div className="space-y-2">
                        {data.events.eventsByCategory.map((item) => (
                          <div key={item.category} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.category}</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{
                                    width: `${(item.count / Math.max(...data.events.eventsByCategory.map(e => e.count))) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Top Events</h4>
                      <div className="space-y-3">
                        {data.events.topEvents.map((event, index) => (
                          <div key={event.id} className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{event.name}</p>
                              <p className="text-xs text-gray-500">{event.bookings} bookings</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'events' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Event Analytics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Events by Category</h4>
                      <div className="space-y-4">
                        {data.events.eventsByCategory.map((item) => (
                          <div key={item.category} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.category}</span>
                              <span className="text-2xl font-bold text-indigo-600">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Most Popular Events</h4>
                      <div className="space-y-4">
                        {data.events.topEvents.map((event) => (
                          <div key={event.id} className="border rounded-lg p-4">
                            <h5 className="font-medium text-gray-900">{event.name}</h5>
                            <p className="text-sm text-gray-600 mt-1">{event.bookings} total bookings</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'bookings' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Booking Analytics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Bookings by Status</h4>
                      <div className="space-y-3">
                        {data.bookings.bookingsByStatus.map((item) => (
                          <div key={item.status} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center">
                              {item.status === 'CONFIRMED' && <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
                              {item.status === 'PENDING' && <Clock className="h-5 w-5 text-yellow-500 mr-2" />}
                              {item.status === 'CANCELLED' && <XCircle className="h-5 w-5 text-red-500 mr-2" />}
                              <span className="font-medium">{item.status}</span>
                            </div>
                            <span className="text-lg font-bold">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Monthly Bookings</h4>
                      <div className="space-y-2">
                        {data.bookings.bookingsByMonth.map((item) => (
                          <div key={item.month} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.month}</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{
                                    width: `${(item.count / Math.max(...data.bookings.bookingsByMonth.map(b => b.count))) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">User Analytics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">User Growth</h4>
                      <div className="space-y-2">
                        {data.users.usersByMonth.map((item) => (
                          <div key={item.month} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.month}</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{
                                    width: `${(item.count / Math.max(...data.users.usersByMonth.map(u => u.count))) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Activity</h4>
                      <div className="space-y-3">
                        {data.users.userActivity.slice(-5).map((item) => (
                          <div key={item.date} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm text-gray-600">
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center">
                              <Activity className="h-4 w-4 text-green-500 mr-2" />
                              <span className="font-medium">{item.activeUsers} active</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'revenue' && (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Revenue Analytics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Monthly Revenue</h4>
                      <div className="space-y-2">
                        {data.revenue.revenueByMonth.map((item) => (
                          <div key={item.month} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{item.month}</span>
                            <div className="flex items-center">
                              <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{
                                    width: `${(item.revenue / Math.max(...data.revenue.revenueByMonth.map(r => r.revenue))) * 100}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(item.revenue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Revenue by Category</h4>
                      <div className="space-y-3">
                        {data.revenue.revenueByCategory.map((item) => (
                          <div key={item.category} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.category}</span>
                              <span className="text-lg font-bold text-green-600">
                                {formatCurrency(item.revenue)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAdminAuth(AdminAnalyticsPage);
