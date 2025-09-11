-- CreateEnum
CREATE TYPE "public"."WaitlistStatus" AS ENUM ('ACTIVE', 'NOTIFIED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."waitlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "public"."WaitlistStatus" NOT NULL DEFAULT 'ACTIVE',
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "waitlist_eventId_position_idx" ON "public"."waitlist"("eventId", "position");

-- CreateIndex
CREATE INDEX "waitlist_status_idx" ON "public"."waitlist"("status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_userId_eventId_key" ON "public"."waitlist"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "public"."waitlist" ADD CONSTRAINT "waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waitlist" ADD CONSTRAINT "waitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
