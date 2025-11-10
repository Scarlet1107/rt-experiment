-- CreateTable
CREATE TABLE "feedback_patterns" (
    "id" TEXT PRIMARY KEY,
    "participant_id" TEXT NOT NULL,
    "language" "LanguageType" NOT NULL DEFAULT 'ja',
    "patterns" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_patterns_participant_id_key" ON "feedback_patterns"("participant_id");
