import { ExperimentConfig } from '@/types';

const DEFAULT_BLOCK_COUNT = 8;
const DEFAULT_TRIALS_PER_BLOCK = 60;
const DEFAULT_FEEDBACK_COUNTDOWN_SECONDS = 15;

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const totalBlocks = parsePositiveInteger(
    process.env.NEXT_PUBLIC_EXPERIMENT_BLOCK_COUNT,
    DEFAULT_BLOCK_COUNT
);

const trialsPerBlock = parsePositiveInteger(
    process.env.NEXT_PUBLIC_EXPERIMENT_TRIALS_PER_BLOCK,
    DEFAULT_TRIALS_PER_BLOCK
);

const feedbackCountdownSeconds = parsePositiveInteger(
    process.env.NEXT_PUBLIC_FEEDBACK_TIMEOUT_SECONDS,
    DEFAULT_FEEDBACK_COUNTDOWN_SECONDS
);

export const experimentConfig: ExperimentConfig = {
    totalBlocks,
    trialsPerBlock,
    totalTrials: totalBlocks * trialsPerBlock,
    feedbackCountdownSeconds,
};
