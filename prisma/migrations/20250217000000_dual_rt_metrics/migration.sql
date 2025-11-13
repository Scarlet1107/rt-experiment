-- Add columns to track both inclusive and correct-only reaction times
ALTER TABLE "experiments"
ADD COLUMN "overall_avg_rt_correct_only" DOUBLE PRECISION;

ALTER TABLE "blocks"
ADD COLUMN "average_rt_correct_only" DOUBLE PRECISION;
