import { ExperimentConfig } from '@/types';

const DEFAULT_BLOCK_COUNT = 8;
const DEFAULT_TRIALS_PER_BLOCK = 48;
const DEFAULT_FEEDBACK_COUNTDOWN_SECONDS = 15;
const DEFAULT_PRACTICE_TRIAL_COUNT = 10;
const DEFAULT_FEEDBACK_BUTTON_DELAY_MS = 3000;

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const parseNonNegativeInteger = (value: string | undefined, fallback: number) => {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.floor(parsed);
};

const parseBoolean = (value: string | undefined, fallback = false) => {
    if (value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
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

const practiceTrialCount = parsePositiveInteger(
    process.env.NEXT_PUBLIC_PRACTICE_TRIAL_COUNT,
    DEFAULT_PRACTICE_TRIAL_COUNT
);

const trialTimeLimitRaw = parseNonNegativeInteger(
    process.env.NEXT_PUBLIC_TRIAL_TIME_LIMIT_MS,
    0
);

const trialTimeLimitMs = trialTimeLimitRaw > 0 ? trialTimeLimitRaw : null;

const feedbackButtonDelayMs = parseNonNegativeInteger(
    process.env.NEXT_PUBLIC_FEEDBACK_BUTTON_DELAY_MS,
    DEFAULT_FEEDBACK_BUTTON_DELAY_MS
);

const showProgressDebug = parseBoolean(
    process.env.NEXT_PUBLIC_EXPERIMENT_DEBUG_PROGRESS,
    false
);

export const experimentConfig: ExperimentConfig = {
    totalBlocks,
    trialsPerBlock,
    totalTrials: totalBlocks * trialsPerBlock,
    feedbackCountdownSeconds,
    practiceTrialCount,
    trialTimeLimitMs,
    feedbackButtonDelayMs,
    showProgressDebug,
};
