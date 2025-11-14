import type { FeedbackPattern, FeedbackScenarioKey } from '@/types';

const RT_CHANGE_THRESHOLD = 30;
const RT_STRONG_THRESHOLD = 80;
const ACC_CHANGE_THRESHOLD = 2;
const ACC_STRONG_THRESHOLD = 5;

export function determineScenarioKey(
  currentBlock: { accuracy: number; averageRT: number },
  previousBlock: { accuracy: number; averageRT: number } | null
): FeedbackScenarioKey {
  if (!previousBlock) {
    return 'rt_same_acc_same';
  }

  const accuracyDiff = currentBlock.accuracy - previousBlock.accuracy;
  const rtDiff = currentBlock.averageRT - previousBlock.averageRT;

  const rtImproved = rtDiff <= -RT_CHANGE_THRESHOLD;
  const rtStrongImproved = rtDiff <= -RT_STRONG_THRESHOLD;
  const rtDeclined = rtDiff >= RT_CHANGE_THRESHOLD;
  const rtStrongDeclined = rtDiff >= RT_STRONG_THRESHOLD;

  const accUp = accuracyDiff >= ACC_CHANGE_THRESHOLD;
  const accStrongUp = accuracyDiff >= ACC_STRONG_THRESHOLD;
  const accDown = accuracyDiff <= -ACC_CHANGE_THRESHOLD;
  const accStrongDown = accuracyDiff <= -ACC_STRONG_THRESHOLD;

  if (rtStrongImproved && accStrongUp) {
    return 'rt_short_acc_up_synergy';
  }

  if (rtStrongDeclined && accStrongDown) {
    return 'rt_slow_acc_down_fatigue';
  }

  if (rtImproved) {
    if (accUp) return 'rt_short_acc_up';
    if (accDown) return 'rt_short_acc_down';
    return 'rt_short_acc_same';
  }

  if (rtDeclined) {
    if (accUp) return 'rt_slow_acc_up';
    if (accDown) return 'rt_slow_acc_down';
    return 'rt_slow_acc_same';
  }

  if (accUp) return 'rt_same_acc_up';
  if (accDown) return 'rt_same_acc_down';
  return 'rt_same_acc_same';
}

export function selectFeedback(
  currentBlock: { accuracy: number; averageRT: number },
  previousBlock: { accuracy: number; averageRT: number } | null,
  patterns: FeedbackPattern
): string {
  const scenario = determineScenarioKey(currentBlock, previousBlock);
  const messages = patterns[scenario];
  const fallback = patterns.rt_same_acc_same;
  return randomSelect(messages && messages.length > 0 ? messages : fallback);
}

function randomSelect<T>(array: T[]): T {
  if (!array || array.length === 0) {
    return 'Keep going! You got this!' as T;
  }
  return array[Math.floor(Math.random() * array.length)];
}
