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
    "name" TEXT,
    "student_id" TEXT,
    "handedness" "HandednessType",
    "age" INTEGER,
    "gender" "GenderType",
    "nickname" TEXT,
    "preferred_praise" TEXT,
    "tone_preference" "TonePreferenceType",
    "motivation_style" "MotivationStyleType",
    "evaluation_focus" "EvaluationFocusType",
    "language" "LanguageType" NOT NULL DEFAULT 'ja',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

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
    "overall_avg_rt_correct_only" DOUBLE PRECISION,
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
    "average_rt_correct_only" DOUBLE PRECISION,
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

-- CreateTable
CREATE TABLE "feedback_patterns" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "language" "LanguageType" NOT NULL DEFAULT 'ja',
    "patterns" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiments_participant_id_idx" ON "experiments"("participant_id");

-- CreateIndex
CREATE INDEX "blocks_experiment_id_idx" ON "blocks"("experiment_id");

-- CreateIndex
CREATE INDEX "trials_block_id_idx" ON "trials"("block_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_patterns_participant_id_key" ON "feedback_patterns"("participant_id");

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trials" ADD CONSTRAINT "trials_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

