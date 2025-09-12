import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import prisma from '../lib/prisma';

// Create Redis connection for seat booking queue
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Create seat booking queue
const seatBookingQueue = new Queue('seat-booking', {
  connection: redisConnection,
});

// Seat booking job data interface
interface SeatBookingJobData {
  userId: string;
  eventId: string;
  seatIds: string[];
  idempotencyKey?: string;
  timestamp: number;
}

// Seat booking result interface
interface SeatBookingResult {
  success: boolean;
  bookingId?: string;
  message: string;
  unavailableSeats?: any[];
  totalPrice?: number;
}

// Add a seat booking job to the queue
export const addSeatBookingJob = async (data: SeatBookingJobData): Promise<string> => {
  const job = await seatBookingQueue.add('book-seats', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    // Use seat IDs as job ID to prevent duplicate bookings
    jobId: `${data.userId}-${data.eventId}-${data.seatIds.join('-')}-${data.timestamp}`,
  });
  
  return job.id!;
};

// Get job result
export const getSeatBookingResult = async (jobId: string): Promise<SeatBookingResult | null> => {
  const job = await seatBookingQueue.getJob(jobId);
  
  if (!job) {
    return null;
  }
  
  if (job.finishedOn) {
    return job.returnvalue as SeatBookingResult;
  }
  
  if (job.failedReason) {
    return {
      success: false,
      message: job.failedReason
    };
  }
  
  // Job is still processing
  return {
    success: false,
    message: 'Booking is being processed...'
  };
};

// Worker to process seat booking jobs
const seatBookingWorker = new Worker('seat-booking', async (job: Job<SeatBookingJobData>) => {
  const { userId, eventId, seatIds, idempotencyKey } = job.data;
  
  console.log(`🎫 Processing seat booking job ${job.id} for user ${userId}`);
  
  try {
    // Use a distributed lock to ensure only one booking can happen at a time for each seat
    const lockKey = `seat-lock:${seatIds.join(':')}`;
    const lockValue = `${userId}-${Date.now()}`;
    const lockTtl = 30; // 30 seconds
    
    // Try to acquire lock
    const lockAcquired = await redisConnection.set(lockKey, lockValue, 'EX', lockTtl, 'NX');
    
    if (!lockAcquired) {
      return {
        success: false,
        message: 'Seats are currently being booked by another user. Please try again.'
      };
    }
    
    try {
      // Process the booking within the lock
      const result = await processSeatBooking(userId, eventId, seatIds, idempotencyKey);
      return result;
    } finally {
      // Release the lock
      const currentLock = await redisConnection.get(lockKey);
      if (currentLock === lockValue) {
        await redisConnection.del(lockKey);
      }
    }
  } catch (error: any) {
    console.error(`❌ Seat booking job ${job.id} failed:`, error);
    return {
      success: false,
      message: error.message || 'Booking failed due to an unexpected error'
    };
  }
}, {
  connection: redisConnection,
  concurrency: 5, // Process up to 5 bookings concurrently
});

// Process seat booking logic
async function processSeatBooking(
  userId: string, 
  eventId: string, 
  seatIds: string[], 
  idempotencyKey?: string
): Promise<SeatBookingResult> {
  
  // Check for duplicate booking first
  if (idempotencyKey) {
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId,
        eventId,
        idempotencyKey,
        status: 'CONFIRMED'
      }
    });
    
    if (existingBooking) {
      return {
        success: true,
        bookingId: existingBooking.id,
        message: 'Booking already exists',
        totalPrice: parseFloat(existingBooking.totalPrice.toString())
      };
    }
  }
  
  // Get event with venue details
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venueDetails: {
        include: {
          sections: {
            include: {
              seats: {
                where: { id: { in: seatIds } },
                include: {
                  section: true,
                  bookings: {
                    where: {
                      booking: {
                        status: 'CONFIRMED'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (!event || !event.seatLevelBooking) {
    return {
      success: false,
      message: 'Event not found or does not support seat selection'
    };
  }
  
  // Collect all seats
  const allSeats = event.venueDetails?.sections.flatMap(section => section.seats) || [];
  
  // Check seat availability
  const unavailableSeats: any[] = [];
  const availableSeats: any[] = [];
  
  for (const seatId of seatIds) {
    const seat = allSeats.find(s => s.id === seatId);
    if (!seat) {
      return {
        success: false,
        message: `Seat ${seatId} not found`
      };
    }
    
    if (seat.isBlocked || seat.bookings.length > 0) {
      unavailableSeats.push({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        reason: seat.isBlocked ? 'blocked' : 'already_booked'
      });
    } else {
      availableSeats.push(seat);
    }
  }
  
  if (unavailableSeats.length > 0) {
    return {
      success: false,
      message: 'Some selected seats are no longer available',
      unavailableSeats
    };
  }
  
  // Calculate total price
  const totalPrice = availableSeats.reduce((total, seat) => {
    const sectionPrice = Number(event.price) * Number(seat.section.priceMultiplier);
    return total + sectionPrice;
  }, 0);
  
  // Create booking in transaction
  const booking = await prisma.$transaction(async (tx) => {
    // Double-check seat availability within transaction
    const seatBookings = await tx.seatBooking.findMany({
      where: {
        seatId: { in: seatIds },
        booking: {
          status: 'CONFIRMED'
        }
      }
    });
    
    if (seatBookings.length > 0) {
      throw new Error('One or more seats were just booked by another user');
    }
    
    // Create the booking
    const newBooking = await tx.booking.create({
      data: {
        userId,
        eventId,
        quantity: seatIds.length,
        totalPrice,
        status: 'CONFIRMED',
        idempotencyKey: idempotencyKey || `seat-${userId}-${eventId}-${Date.now()}`
      }
    });
    
    // Create seat bookings with individual prices
    await tx.seatBooking.createMany({
      data: seatIds.map(seatId => {
        const seat = availableSeats.find(s => s.id === seatId)!;
        const seatPrice = Number(event.price) * Number(seat.section.priceMultiplier);
        return {
          bookingId: newBooking.id,
          seatId,
          price: seatPrice
        };
      })
    });
    
    // Update event available capacity
    await tx.event.update({
      where: { id: eventId },
      data: {
        availableCapacity: {
          decrement: seatIds.length
        },
        version: {
          increment: 1
        }
      }
    });
    
    return newBooking;
  });
  
  console.log(`✅ Seat booking created: ${booking.id} for user ${userId}`);
  
  return {
    success: true,
    bookingId: booking.id,
    message: `Successfully booked ${seatIds.length} seat(s)`,
    totalPrice
  };
}

// Worker error handling
seatBookingWorker.on('completed', (job) => {
  console.log(`✅ Seat booking job ${job.id} completed`);
});

seatBookingWorker.on('failed', (job, err) => {
  console.error(`❌ Seat booking job ${job?.id} failed:`, err);
});

export { seatBookingQueue, seatBookingWorker };
