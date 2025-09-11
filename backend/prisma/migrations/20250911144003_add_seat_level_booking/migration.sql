-- CreateEnum
CREATE TYPE "public"."SeatType" AS ENUM ('REGULAR', 'VIP', 'PREMIUM', 'ACCESSIBLE', 'STANDING');

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "seatLevelBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "venueId" TEXT;

-- CreateTable
CREATE TABLE "public"."venues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "capacity" INTEGER NOT NULL,
    "description" TEXT,
    "layout" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."venue_sections" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "priceMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seats" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "seatType" "public"."SeatType" NOT NULL DEFAULT 'REGULAR',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seat_bookings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seats_sectionId_row_number_key" ON "public"."seats"("sectionId", "row", "number");

-- CreateIndex
CREATE UNIQUE INDEX "seat_bookings_bookingId_seatId_key" ON "public"."seat_bookings"("bookingId", "seatId");

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."venue_sections" ADD CONSTRAINT "venue_sections_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seats" ADD CONSTRAINT "seats_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."venue_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seat_bookings" ADD CONSTRAINT "seat_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seat_bookings" ADD CONSTRAINT "seat_bookings_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
