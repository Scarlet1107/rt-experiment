-- AlterTable
ALTER TABLE "participants"
    ALTER COLUMN "name" DROP NOT NULL,
    ALTER COLUMN "student_id" DROP NOT NULL,
    ALTER COLUMN "handedness" DROP NOT NULL,
    ALTER COLUMN "age" DROP NOT NULL,
    ALTER COLUMN "gender" DROP NOT NULL,
    ALTER COLUMN "nickname" DROP NOT NULL,
    ALTER COLUMN "preferred_praise" DROP NOT NULL,
    ALTER COLUMN "tone_preference" DROP NOT NULL,
    ALTER COLUMN "motivation_style" DROP NOT NULL,
    ALTER COLUMN "evaluation_focus" DROP NOT NULL;
