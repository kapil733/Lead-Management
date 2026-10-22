-- CreateEnum
CREATE TYPE "BikeType" AS ENUM ('PETROL_BIKE', 'EV_BIKE');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "bikeType" "BikeType",
ADD COLUMN     "location" TEXT;
