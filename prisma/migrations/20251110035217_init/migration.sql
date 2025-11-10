-- CreateEnum
CREATE TYPE "LanguageType" AS ENUM ('ja', 'en');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('static', 'personalized');

-- CreateEnum
CREATE TYPE "TonePreferenceType" AS ENUM ('casual', 'gentle', 'formal');

-- CreateEnum
CREATE TYPE "MotivationStyleType" AS ENUM ('empathetic', 'cheerleader', 'advisor');

-- CreateEnum
CREATE TYPE "EvaluationFocusType" AS ENUM ('self-progress', 'social-comparison', 'positive-focus');

-- CreateEnum
CREATE TYPE "HandednessType" AS ENUM ('right', 'left', 'other');

-- CreateEnum
CREATE TYPE "GenderType" AS ENUM ('male', 'female', 'other');

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "handedness" "HandednessType" NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "GenderType" NOT NULL,
    "nickname" TEXT NOT NULL,
    "preferred_praise" TEXT NOT NULL,
    "tone_preference" "TonePreferenceType" NOT NULL,
    "motivation_style" "MotivationStyleType" NOT NULL,
    "evaluation_focus" "EvaluationFocusType" NOT NULL,
    "language" "LanguageType" NOT NULL DEFAULT 'ja',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "condition_type" "ConditionType" NOT NULL,
    "session_number" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "total_trials" INTEGER NOT NULL DEFAULT 0,
    "overall_accuracy" DOUBLE PRECISION,
    "overall_avg_rt" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "trial_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "average_rt" DOUBLE PRECISION,
    "feedback_shown" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trials" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "trial_number" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "word_type" TEXT NOT NULL,
    "ink_color" TEXT NOT NULL,
    "is_congruent" BOOLEAN NOT NULL,
    "response_key" TEXT,
    "chosen_answer" TEXT,
    "is_correct" BOOLEAN,
    "reaction_time" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiments_participant_id_idx" ON "experiments"("participant_id");

-- CreateIndex
CREATE INDEX "blocks_experiment_id_idx" ON "blocks"("experiment_id");

-- CreateIndex
CREATE INDEX "trials_block_id_idx" ON "trials"("block_id");

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trials" ADD CONSTRAINT "trials_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
