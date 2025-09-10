-- CreateEnum
CREATE TYPE "public"."EventCategory" AS ENUM ('CONFERENCE', 'WORKSHOP', 'NETWORKING', 'SOCIAL', 'BUSINESS', 'ENTERTAINMENT', 'SPORTS', 'EDUCATION', 'CULTURAL', 'OTHER');

-- AlterTable
ALTER TABLE "public"."events" ADD COLUMN     "category" "public"."EventCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "events_category_idx" ON "public"."events"("category");

-- CreateIndex
CREATE INDEX "events_price_idx" ON "public"."events"("price");
