"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Event } from "@/types";
import { Navbar } from "@/components/Navbar";
import SeatSelection from "@/components/SeatSelection";
import CongratulationsPopup from "@/components/CongratulationsPopup";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  CreditCard,
  Info,
  Tag,
} from "lucide-react";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [lastBooking, setLastBooking] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [seatRefreshTrigger, setSeatRefreshTrigger] = useState(0);

  const eventId = params?.id as string;

  // Debug effect for congratulations popup
  useEffect(() => {
    if (showCongratulations && lastBooking) {
      console.log('🎉 Congratulations popup should be visible:', { showCongratulations, lastBooking });
    }
  }, [showCongratulations, lastBooking]);

  // Temporary debug function to test popup (remove in production)
  useEffect(() => {
    (window as any).testSeatBookingPopup = () => {
      console.log('🧪 Testing seat booking popup...');
      setLastBooking({
        id: 'test-booking-123',
        eventName: 'Test Event',
        ticketCount: 2,
        totalPrice: 151.98
      });
      setShowCongratulations(true);
    };
  }, []);

  const getCategoryColor = (category: string) => {
    const colors = {
      CONFERENCE: "bg-blue-100 text-blue-800",
      WORKSHOP: "bg-green-100 text-green-800",
      NETWORKING: "bg-purple-100 text-purple-800",
      SOCIAL: "bg-pink-100 text-pink-800",
      BUSINESS: "bg-gray-100 text-gray-800",
      ENTERTAINMENT: "bg-yellow-100 text-yellow-800",
      SPORTS: "bg-orange-100 text-orange-800",
      EDUCATION: "bg-indigo-100 text-indigo-800",
      CULTURAL: "bg-red-100 text-red-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[category as keyof typeof colors] || colors.OTHER;
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? "Free" : numPrice.toFixed(2);
  };

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const response = await apiClient.getEvent(eventId);

        // Handle different response structures from backend
        const responseData = (response as any)?.data || response;
        const eventData = responseData?.event || responseData;
        const userStatus = responseData?.userStatus || null;
        const availability = responseData?.availability || null;

        // Combine all data into the event object
        const fullEventData = {
          ...eventData,
          userStatus,
          availability,
          _count: {
            ...(eventData._count || { bookings: 0 }),
            waitlist: availability?.waitlistCount || 0,
          },
        };

        setEvent(fullEventData);
      } catch (error) {
        console.error("Failed to load event:", error);
        setError("Event not found");
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
      router.push("/login");
      return;
    }

    if (!event) {
      setError("Event not found");
      return;
    }

    // Validate booking based on event type
    if (event.seatLevelBooking) {
      if (selectedSeats.length === 0) {
        setError("Please select at least one seat");
        return;
      }
    } else {
      if (quantity <= 0) {
        setError("Invalid quantity");
        return;
      }
      if (quantity > event.availableCapacity) {
        setError(`Only ${event.availableCapacity} tickets available`);
        return;
      }
    }

    console.log('🎭 Starting booking process...', { 
      seatLevelBooking: event.seatLevelBooking, 
      selectedSeats: selectedSeats.length,
      quantity 
    });
    setBookingLoading(true);
    setError("");
    setSuccess("");

    try {
      let response;

      if (event.seatLevelBooking && selectedSeats.length > 0) {
        // Book specific seats (asynchronous)
        response = await apiClient.bookSeats({
          eventId: event.id,
          seatIds: selectedSeats,
          idempotencyKey: `${user?.id}-${event.id}-${Date.now()}`,
        });

        const responseData = (response as any)?.data || response;
        console.log('🔍 Seat booking API response:', { response, responseData });
        
        // Check if booking completed immediately (fallback case)
        if (responseData.success === true || (response as any)?.data?.success === true) {
          // Direct booking success
          console.log('✅ Direct seat booking success, setting up congratulations popup');
          setLastBooking({
            id: responseData.bookingId || `seat-booking-${Date.now()}`,
            eventName: event.name,
            ticketCount: selectedSeats.length,
            totalPrice: responseData.totalPrice || parseFloat(calculateTotalPrice()),
          });

          console.log('✅ Setting lastBooking and showCongratulations:', {
            lastBooking: {
              id: responseData.bookingId || `seat-booking-${Date.now()}`,
              eventName: event.name,
              ticketCount: selectedSeats.length,
              totalPrice: responseData.totalPrice || parseFloat(calculateTotalPrice()),
            }
          });
          setShowCongratulations(true);

          // Reset form and refresh data
          setQuantity(1);
          setSelectedSeats([]);
          setTotalPrice(0);

          // Refresh event data
          const updatedResponse = await apiClient.getEvent(eventId);
          const updatedEvent = (updatedResponse as any)?.data?.event || updatedResponse;
          setEvent(updatedEvent);
          setSeatRefreshTrigger((prev) => prev + 1);
        } else if (responseData.jobId) {
          // Async booking with job polling
          const jobId = responseData.jobId;
          // Poll for booking status
          const pollBookingStatus = async (
            jobId: string,
            maxAttempts = 30
          ): Promise<boolean> => {
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              try {
                const statusResponse = await apiClient.checkBookingStatus(
                  jobId
                );
                const statusData = (statusResponse as any)?.data;

                if (statusData?.success) {
                  // Booking successful
                  setLastBooking({
                    id: statusData.bookingId || jobId,
                    eventName: event.name,
                    ticketCount: selectedSeats.length,
                    totalPrice:
                      statusData.totalPrice ||
                      parseFloat(calculateTotalPrice()),
                  });

                  console.log('✅ Polling seat booking success, showing congratulations popup');
                  setShowCongratulations(true);

                  // Reset form and refresh data
                  setQuantity(1);
                  setSelectedSeats([]);
                  setTotalPrice(0);

                  // Refresh event data
                  const updatedResponse = await apiClient.getEvent(eventId);
                  const updatedEvent =
                    (updatedResponse as any)?.data?.event || updatedResponse;
                  setEvent(updatedEvent);
                  setSeatRefreshTrigger((prev) => prev + 1);

                  return true;
                } else if (
                  statusData?.message &&
                  !statusData.message.includes("processing")
                ) {
                  // Booking failed - set error state instead of toast
                  setError(statusData.message || "Booking failed");
                  return false;
                }

                // Still processing, wait and retry
                await new Promise((resolve) => setTimeout(resolve, 2000));
              } catch (error) {
                console.error("Error checking booking status:", error);
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }

            // Timeout
            return false;
          };

          await pollBookingStatus(jobId);
        }
      } else {
        // Regular booking (synchronous)
        const bookingData = {
          eventId: event.id,
          quantity,
          totalPrice: calculateTotalPrice(),
        };
        response = await apiClient.createBooking(bookingData);

        if (response) {
          const responseData = (response as any)?.data || response;
          const booking = responseData.booking || responseData;

          setLastBooking({
            id: booking.id,
            eventName: event.name,
            ticketCount: quantity,
            totalPrice: parseFloat(calculateTotalPrice()),
          });

          setShowCongratulations(true);

          // Reset form and refresh data
          setQuantity(1);
          setTotalPrice(0);

          const updatedResponse = await apiClient.getEvent(eventId);
          const updatedEvent =
            (updatedResponse as any)?.data?.event || updatedResponse;
          setEvent(updatedEvent);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create booking";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!event) {
      setError("Event not found");
      return;
    }

    setBookingLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient.joinWaitlist(event.id);

      if (response?.status === "success") {
        const position = response?.data?.waitlistEntry?.position || "?";
        showToast(
          `You've been added to the waitlist at position #${position}!`,
          "success"
        );

        // Refresh event data to update waitlist status
        const updatedResponse = await apiClient.getEvent(eventId);
        const updatedEventData =
          (updatedResponse as any)?.data || updatedResponse;

        // Parse the response properly
        const updatedEvent = updatedEventData?.event || updatedEventData;
        const userStatus = updatedEventData?.userStatus || null;
        const availability = updatedEventData?.availability || null;

        // Combine data
        const fullEventData = {
          ...updatedEvent,
          userStatus,
          availability,
          _count: {
            ...(updatedEvent._count || { bookings: 0 }),
            waitlist: availability?.waitlistCount || 0,
          },
        };

        setEvent(fullEventData);
        setSuccess(
          `You've successfully joined the waitlist at position #${position}. We'll notify you when a spot becomes available.`
        );
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to join waitlist";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSeatsSelected = useCallback(
    (seatIds: string[], price: number) => {
      setSelectedSeats(seatIds);
      setTotalPrice(price);
    },
    []
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate total price based on event type
  const calculateTotalPrice = () => {
    if (!event) return "0.00";
    if (event.seatLevelBooking && selectedSeats.length > 0) {
      return totalPrice.toFixed(2);
    }
    return (parseFloat(event.price) * quantity).toFixed(2);
  };

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
            <div className="w-full h-64 md:h-80 relative">
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(
                        event.category
                      )}`}
                    >
                      {event.category}
                    </span>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-black">
                    <Calendar className="h-5 w-5 mr-3" />
                    <span className="text-lg">
                      {formatDate(event.startTime)}
                    </span>
                  </div>
                  {event.endTime && (
                    <div className="flex items-center text-black ml-8">
                      <span className="text-sm">
                        Ends: {formatDate(event.endTime)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center text-black">
                    <MapPin className="h-5 w-5 mr-3" />
                    <span className="text-lg">{event.venue}</span>
                  </div>
                  <div className="flex items-center text-black">
                    <Users className="h-5 w-5 mr-3" />
                    <span className="text-lg">
                      {event.availableCapacity} of {event.capacity} spots
                      available
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-3xl font-bold text-blue-600">
                    ${formatPrice(event.price)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      event.availableCapacity > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {event.availableCapacity > 0 ? "Available" : "Sold Out"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Description */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              About This Event
            </h2>
            <div className="text-gray-700 leading-relaxed">
              {event.description ? (
                <p>{event.description}</p>
              ) : (
                <p className="text-gray-500 italic">
                  No description available for this event.
                </p>
              )}
            </div>
          </div>

          {/* Booking Section */}
          {event.availableCapacity > 0 && (
            <div className="px-6 py-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Book Your Tickets
              </h2>

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
                {/* Seat Selection for seat-level booking events */}
                {event.seatLevelBooking ? (
                  <div className="space-y-6">
                    <SeatSelection
                      eventId={event.id}
                      onSeatsSelected={handleSeatsSelected}
                      maxSeats={10}
                      refreshTrigger={seatRefreshTrigger}
                    />

                    {selectedSeats.length > 0 && (
                      <div className="bg-white rounded-lg p-4 border">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Order Summary
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Selected seats:</span>
                            <span className="font-medium text-gray-800">
                              {selectedSeats.length}
                            </span>
                          </div>
                          <div className="border-t pt-1 mt-2">
                            <div className="flex justify-between font-semibold">
                              <span className="text-gray-700">Total:</span>
                              <span className="text-green-600">
                                ${totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Regular ticket selection */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="quantity"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Number of Tickets
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        min="1"
                        max={Math.min(event.availableCapacity, 10)}
                        value={quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (
                            value >= 1 &&
                            value <= Math.min(event.availableCapacity, 10)
                          ) {
                            setQuantity(value);
                          }
                        }}
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (isNaN(value) || value < 1) {
                            setQuantity(1);
                          } else if (
                            value > Math.min(event.availableCapacity, 10)
                          ) {
                            setQuantity(Math.min(event.availableCapacity, 10));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={bookingLoading}
                        placeholder="Enter number of tickets"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        Max {Math.min(event.availableCapacity, 10)} tickets
                        allowed
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Order Summary
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Price per ticket:</span>
                          <span className="font-medium text-gray-800">
                            ${formatPrice(event.price)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Quantity:</span>
                          <span className="font-medium text-gray-800">
                            {quantity}
                          </span>
                        </div>
                        <div className="border-t pt-1 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-gray-700">Total:</span>
                            <span className="text-green-600">
                              ${calculateTotalPrice()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                  {isAuthenticated ? (
                    <button
                      onClick={handleBooking}
                      disabled={
                        bookingLoading ||
                        (event.seatLevelBooking && selectedSeats.length === 0)
                      }
                      className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bookingLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5 mr-2" />
                          {event.seatLevelBooking
                            ? `Book ${selectedSeats.length} Selected Seat${
                                selectedSeats.length !== 1 ? "s" : ""
                              }`
                            : `Book ${quantity} Ticket${quantity > 1 ? "s" : ""}`}
                        </>
                      )}
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
                    Your booking will be confirmed immediately and you&apos;ll
                    receive a confirmation email.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sold Out Message with Waitlist Option */}
          {event.availableCapacity === 0 && (
            <div className="px-6 py-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Event Sold Out
                </h3>

                {success && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-center">
                      <Info className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-green-600 text-sm">{success}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center justify-center">
                      <Info className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {!isAuthenticated ? (
                  <>
                    <p className="text-red-600 mb-4">
                      This event has reached its capacity. You can join the
                      waitlist to be notified if spots become available.
                    </p>
                    <Link
                      href={`/login?redirect=/events/${eventId}`}
                      className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 mr-3"
                    >
                      Sign In to Join Waitlist
                    </Link>
                  </>
                ) : event.userStatus?.waitlistPosition ? (
                  <div className="bg-yellow-100 text-yellow-800 p-4 rounded-md mb-4">
                    <p className="font-semibold mb-1">
                      🎯 You're on the waitlist!
                    </p>
                    <p className="text-lg">
                      Position #{event.userStatus.waitlistPosition} in line
                    </p>
                    <p className="text-sm mt-2">
                      We'll notify you immediately if a spot becomes available.
                    </p>
                    {event._count?.waitlist && (
                      <p className="text-xs mt-1">
                        {event._count.waitlist} total people on waitlist
                      </p>
                    )}
                  </div>
                ) : event.userStatus?.hasBooking ? (
                  <div className="bg-green-100 text-green-800 p-4 rounded-md mb-4">
                    <p className="font-semibold">
                      ✅ You already have a ticket for this event!
                    </p>
                  </div>
                ) : event.userStatus?.canJoinWaitlist !== false ? (
                  <>
                    <p className="text-red-600 mb-4">
                      This event has reached its capacity. Join the waitlist to
                      be notified if spots become available.
                    </p>
                    <button
                      onClick={handleJoinWaitlist}
                      disabled={bookingLoading}
                      className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                    >
                      {bookingLoading ? "Processing..." : "📝 Join Waitlist"}
                    </button>
                    {event._count?.waitlist ? (
                      <p className="text-sm text-gray-600 mb-4">
                        {event._count.waitlist} people are currently on the
                        waitlist
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-red-600 mb-4">
                    This event has reached its capacity. Check back later or
                    explore other events.
                  </p>
                )}

                <Link
                  href="/events"
                  className="inline-flex items-center px-4 py-2 mt-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Browse Other Events
                </Link>
              </div>
            </div>
          )}

          {/* Waitlist Status Section - Show if user is on waitlist */}
          {event.userStatus?.waitlistPosition &&
            event.availableCapacity > 0 && (
              <div className="px-6 py-6 border-b border-gray-200">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center mb-3">
                    <div className="bg-yellow-500 text-white rounded-full p-2 mr-3">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-yellow-800">
                      You're on the Waitlist
                    </h3>
                  </div>
                  <div className="text-yellow-700">
                    <p className="mb-2">
                      <strong>
                        Position #{event.userStatus.waitlistPosition}
                      </strong>{" "}
                      in line
                    </p>
                    <p className="text-sm">
                      Even though tickets are currently available, you'll be
                      notified when it's your turn or if you want to book
                      directly.
                    </p>
                    {event._count?.waitlist && (
                      <p className="text-xs mt-2 text-yellow-600">
                        {event._count.waitlist} total people on waitlist
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Congratulations Popup */}
      {showCongratulations && lastBooking && (
        <CongratulationsPopup
          isOpen={showCongratulations}
          onClose={() => setShowCongratulations(false)}
          eventName={lastBooking.eventName}
          ticketCount={lastBooking.ticketCount}
          bookingId={lastBooking.id}
          totalPrice={lastBooking.totalPrice}
        />
      )}
    </div>
  );
}
