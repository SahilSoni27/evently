'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Users, CreditCard, Shield } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Evently</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Manage Events with
            <span className="block text-blue-600">Confidence</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create, manage, and track your events seamlessly. From small gatherings to large conferences, 
            Evently provides all the tools you need to make your events successful.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything you need to run successful events
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Calendar className="h-12 w-12 text-blue-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Event Management</h4>
              <p className="text-gray-600">
                Create and manage events with ease. Set dates, venues, pricing, and capacity limits.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="h-12 w-12 text-green-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Booking System</h4>
              <p className="text-gray-600">
                Accept bookings online with real-time availability and automatic confirmations.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <CreditCard className="h-12 w-12 text-purple-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Payment Processing</h4>
              <p className="text-gray-600">
                Secure payment processing with support for refunds and payment tracking.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Shield className="h-12 w-12 text-orange-600 mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Admin Dashboard</h4>
              <p className="text-gray-600">
                Powerful analytics and insights to track your event performance and revenue.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="mt-20 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Try the Demo
          </h3>
          <p className="text-center text-gray-600 mb-8">
            Experience Evently with our demo accounts. No registration required!
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link
              href="/login"
              className="border-2 border-blue-200 rounded-lg p-6 hover:border-blue-400 transition-colors group"
            >
              <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                User Demo
              </h4>
              <p className="text-gray-600 mb-4">
                Explore the user experience - browse events, make bookings, and manage your tickets.
              </p>
              <div className="text-sm text-gray-500">
                <div>Email: user@evently.com</div>
                <div>Password: password123</div>
              </div>
            </Link>
            
            <Link
              href="/login"
              className="border-2 border-green-200 rounded-lg p-6 hover:border-green-400 transition-colors group"
            >
              <h4 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-600">
                Admin Demo
              </h4>
              <p className="text-gray-600 mb-4">
                Access the admin dashboard - create events, manage bookings, and view analytics.
              </p>
              <div className="text-sm text-gray-500">
                <div>Email: admin@evently.com</div>
                <div>Password: admin123</div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-blue-400 mr-2" />
            <span className="text-xl font-bold">Evently</span>
          </div>
          <p className="text-gray-400">
            Built with Next.js, TypeScript, and Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
