'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface Seat {
  id: string;
  row: string;
  number: string;
  seatType: string;
  isBlocked: boolean;
  isBooked: boolean;
  price: number;
}

interface Section {
  id: string;
  name: string;
  capacity: number;
  priceMultiplier: number;
  basePrice: number;
  sectionPrice: number;
  seats: Seat[];
}

interface SeatSelectionProps {
  eventId: string;
  onSeatsSelected: (seatIds: string[], totalPrice: number) => void;
  maxSeats?: number;
  refreshTrigger?: number; // Add refresh trigger
}

export default function SeatSelection({ eventId, onSeatsSelected, maxSeats = 1, refreshTrigger }: SeatSelectionProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSeats();
  }, [eventId, refreshTrigger]); // Add refreshTrigger dependency

  const fetchSeats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEventSeats(eventId) as any;
      if (response.status === 'success') {
        setSections(response.data.sections);
      } else {
        throw new Error(response.message || 'Failed to load seats');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seatId: string, seat: Seat) => {
    if (seat.isBooked || seat.isBlocked) return;

    setSelectedSeats(prev => {
      let newSelected;
      if (prev.includes(seatId)) {
        // Deselect seat
        newSelected = prev.filter(id => id !== seatId);
      } else if (prev.length < maxSeats) {
        // Select seat if under limit
        newSelected = [...prev, seatId];
      } else {
        // Replace first selected seat if at limit
        newSelected = [...prev.slice(1), seatId];
      }
      
      return newSelected;
    });
  };

  // Use useEffect to call onSeatsSelected after selectedSeats state has been updated
  useEffect(() => {
    // Calculate total price
    const totalPrice = selectedSeats.reduce((total, selectedSeatId) => {
      const selectedSeat = sections
        .flatMap(section => section.seats)
        .find(s => s.id === selectedSeatId);
      return total + (selectedSeat?.price || 0);
    }, 0);

    onSeatsSelected(selectedSeats, totalPrice);
  }, [selectedSeats, sections, onSeatsSelected]);

  const getSeatStatusClass = (seat: Seat) => {
    if (seat.isBooked) return 'bg-red-500 text-white cursor-not-allowed';
    if (seat.isBlocked) return 'bg-gray-400 text-white cursor-not-allowed';
    if (selectedSeats.includes(seat.id)) return 'bg-blue-500 text-white';
    return 'bg-green-500 text-white hover:bg-green-600 cursor-pointer';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading seats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button 
          onClick={fetchSeats}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Select Your Seats</h3>
        <p className="text-gray-600">
          Selected: {selectedSeats.length} of {maxSeats} seats
        </p>
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span>Blocked</span>
        </div>
      </div>

      {/* Stage/Screen */}
      <div className="text-center">
        <div className="bg-gray-800 text-white px-6 py-2 rounded-lg inline-block mb-6">
          🎭 STAGE
        </div>
      </div>

      {/* Seat Map */}
      <div className="space-y-8">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-lg border p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg text-gray-900">{section.name}</h4>
              <span className="text-green-600 font-medium">
                ${section.sectionPrice.toFixed(2)} per seat
              </span>
            </div>
            
            {/* Group seats by row */}
            {Object.entries(
              section.seats.reduce((acc, seat) => {
                if (!acc[seat.row]) acc[seat.row] = [];
                acc[seat.row].push(seat);
                return acc;
              }, {} as Record<string, Seat[]>)
            ).map(([row, rowSeats]) => (
              <div key={row} className="flex items-center justify-center mb-2">
                <div className="w-8 text-center font-medium text-gray-600 mr-4">
                  {row}
                </div>
                <div className="flex space-x-1">
                  {rowSeats
                    .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                    .map(seat => (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat.id, seat)}
                        disabled={seat.isBooked || seat.isBlocked}
                        className={`
                          w-8 h-8 text-xs font-medium rounded
                          ${getSeatStatusClass(seat)}
                          transition-colors duration-200
                        `}
                        title={`Row ${seat.row}, Seat ${seat.number} - $${seat.price.toFixed(2)}`}
                      >
                        {seat.number}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Selected Seats Summary */}
      {selectedSeats.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold mb-2">Selected Seats:</h4>
          <div className="space-y-1">
            {selectedSeats.map(seatId => {
              const seat = sections
                .flatMap(section => section.seats)
                .find(s => s.id === seatId);
              const section = sections.find(s => 
                s.seats.some(seat => seat.id === seatId)
              );
              
              return seat && section ? (
                <div key={seatId} className="flex justify-between text-sm">
                  <span>{section.name} - Row {seat.row}, Seat {seat.number}</span>
                  <span className="font-medium">${seat.price.toFixed(2)}</span>
                </div>
              ) : null;
            })}
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>
                ${selectedSeats.reduce((total, seatId) => {
                  const seat = sections
                    .flatMap(section => section.seats)
                    .find(s => s.id === seatId);
                  return total + (seat?.price || 0);
                }, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
