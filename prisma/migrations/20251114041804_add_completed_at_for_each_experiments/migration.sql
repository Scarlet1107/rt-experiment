-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "personalized_completed_at" TIMESTAMP(3),
ADD COLUMN     "static_completed_at" TIMESTAMP(3);
