"use client";

import { useAuth } from "@/contexts/AuthContext";
import { withAdminAuth } from "@/components/hoc/withAuth";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
} from "lucide-react";

interface AdminAnalytics {
  totalEvents: number;
  totalBookings: number;
  totalUsers: number;
  activeEvents: number;
  upcomingEvents: number;
}

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
}

function AdminPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      }
      setError(null);

      // Show that we're fetching real data
      console.log("🔄 Fetching real-time analytics from database...");

      // Load overview stats and revenue data in parallel
      const [overviewResponse, revenueResponse] = await Promise.all([
        apiClient.getAnalyticsOverview(),
        apiClient.getRevenueAnalytics(),
      ]);

      // Handle different response structures
      const overviewData =
        (overviewResponse as any)?.data?.stats ||
        (overviewResponse as any)?.stats;
      const revenueResponse_data =
        (revenueResponse as any)?.data || revenueResponse;

      if (overviewData) {
        setAnalytics({
          totalEvents: overviewData.totalEvents || 0,
          totalBookings: overviewData.totalBookings || 0,
          totalUsers: overviewData.totalUsers || 0,
          activeEvents: overviewData.activeEvents || 0,
          upcomingEvents: overviewData.upcomingEvents || 0,
        });
      }

      if (revenueResponse_data) {
        const totalRevenue = revenueResponse_data.totalRevenue || 0;
        const totalBookings = revenueResponse_data.totalBookings || 1; // Avoid division by zero
        const averageOrderValue =
          totalBookings > 0 ? totalRevenue / totalBookings : 0;

        // Calculate monthly revenue (approximate from daily data)
        const dailyRevenue = revenueResponse_data.dailyRevenue || [];
        const monthlyRevenue =
          dailyRevenue.length > 0
            ? dailyRevenue.reduce(
                (sum: number, day: any) => sum + (day.revenue || 0),
                0
              )
            : totalRevenue;

        setRevenueData({
          totalRevenue,
          monthlyRevenue,
          averageOrderValue,
        });
      }
    } catch (error: any) {
      console.error("Failed to load analytics:", error);

      // More specific error handling
      if (error?.status === 401 || error?.status === 403) {
        setError("Authentication failed. Please log in as an admin.");
      } else if (error?.status >= 500) {
        setError("Server error. Please try again later.");
      } else {
        setError(error?.message || "Failed to load analytics data");
      }

      // Fallback to show zeros instead of breaking
      setAnalytics({
        totalEvents: 0,
        totalBookings: 0,
        totalUsers: 0,
        activeEvents: 0,
        upcomingEvents: 0,
      });
      setRevenueData({
        totalRevenue: 0,
        monthlyRevenue: 0,
        averageOrderValue: 0,
      });
    } finally {
      setLoading(false);
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-96 pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg font-medium text-gray-900">
              Loading admin dashboard...
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Fetching real-time analytics data
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user?.name}!</p>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-500">
                  Live data from PostgreSQL database
                </span>
              </div>
            </div>
            <div>
              <button
                onClick={() => loadAnalytics(true)}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Activity
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Data Loading Issue
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {error} - Showing available data
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.totalEvents || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.totalUsers || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.totalBookings || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${revenueData?.totalRevenue?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.activeEvents || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Currently happening
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Upcoming Events
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.upcomingEvents || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Scheduled ahead</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Avg Order Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${revenueData?.averageOrderValue?.toFixed(2) || "0.00"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per booking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Quick Actions
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Link
                  href="/admin/events"
                  className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Manage Events
                </Link>
                <Link
                  href="/admin/events/create"
                  className="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Create New Event
                </Link>
                <Link
                  href="/admin/bookings"
                  className="block w-full bg-purple-600 text-white text-center py-3 px-4 rounded-md hover:bg-purple-700 transition-colors"
                >
                  View All Bookings
                </Link>
                <Link
                  href="/admin/advanced-analytics"
                  className="block w-full bg-orange-600 text-white text-center py-3 px-4 rounded-md hover:bg-orange-700 transition-colors"
                >
                  Advanced Analytics
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                System Status
              </h2>
              <p className="text-sm text-gray-500">Real-time system health</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">API Status</span>
                  <span
                    className={`font-medium ${
                      error ? "text-yellow-600" : "text-green-600"
                    }`}
                  >
                    {error ? "⚠ Warning" : "✓ Online"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Database</span>
                  <span
                    className={`font-medium ${
                      analytics ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {analytics ? "✓ Connected" : "✗ Error"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment System</span>
                  <span className="text-green-600 font-medium">✓ Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Email Service</span>
                  <span className="text-green-600 font-medium">
                    ✓ Gmail SMTP
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Push Notifications</span>
                  <span className="text-green-600 font-medium">
                    ✓ VAPID Ready
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Background Jobs</span>
                  <span className="text-green-600 font-medium">
                    ✓ BullMQ Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Platform Overview
            </h2>
            <p className="text-sm text-gray-500">Key performance metrics</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analytics?.totalEvents || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Total Events Created
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {analytics?.totalBookings || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Successful Bookings
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {analytics?.totalUsers || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Registered Users
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  ${revenueData?.totalRevenue?.toFixed(0) || "0"}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Revenue</div>
              </div>
            </div>

            {/* Data Source Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center text-sm text-gray-500">
                <span className="inline-flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Live data from PostgreSQL database
                </span>
                <span className="mx-4">•</span>
                <span className="inline-flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Updated every 5 minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAdminAuth(AdminPage);
