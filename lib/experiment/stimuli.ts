import { experimentConfig } from '@/lib/config/experiment';
import { StroopStimulus, Color } from '../../types';

// 使用する無意味語（15語固定）
const NONSENSE_WORDS = [
    "bath", "bike", "ghost", "glass", "row", "rat", "cat", "dog",
    "table", "egg", "door", "tree", "fish", "water", "chair"
];

// 色の定義
const COLORS: Color[] = ["RED", "BLUE", "GREEN"];

// 配列をシャッフルする関数
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

const isSameStimulus = (a: StroopStimulus, b: StroopStimulus) =>
    a.word === b.word &&
    a.inkColor === b.inkColor &&
    a.correctAnswer === b.correctAnswer &&
    a.category === b.category;

function shuffleWithoutImmediateRepeats(stimuli: StroopStimulus[]): StroopStimulus[] {
    if (stimuli.length <= 1) {
        return [...stimuli];
    }

    const ordered = shuffleArray(stimuli);

    for (let i = 1; i < ordered.length; i++) {
        if (!isSameStimulus(ordered[i], ordered[i - 1])) continue;

        let swapIndex = i + 1;
        while (swapIndex < ordered.length && isSameStimulus(ordered[swapIndex], ordered[i])) {
            swapIndex++;
        }

        if (swapIndex < ordered.length) {
            [ordered[i], ordered[swapIndex]] = [ordered[swapIndex], ordered[i]];
        } else {
            for (let candidate = 0; candidate < i; candidate++) {
                const prev = candidate > 0 ? ordered[candidate - 1] : undefined;
                const next = ordered[candidate + 1];
                if (
                    !isSameStimulus(ordered[candidate], ordered[i]) &&
                    !isSameStimulus(ordered[candidate], ordered[i - 1]) &&
                    (!prev || !isSameStimulus(prev, ordered[i])) &&
                    (!next || !isSameStimulus(next, ordered[i]))
                ) {
                    [ordered[i], ordered[candidate]] = [ordered[candidate], ordered[i]];
                    break;
                }
            }
        }
    }

    return ordered;
}

function buildBaseStimuliSet(): StroopStimulus[] {
    const stimuli: StroopStimulus[] = [];

    // 色単語刺激（45試行：各色15試行ずつ）
    COLORS.forEach(colorWord => {
        COLORS.forEach(inkColor => {
            // 各色の組み合わせで5試行ずつ
            for (let i = 0; i < 5; i++) {
                stimuli.push({
                    word: colorWord.toLowerCase(), // "red", "blue", "green"
                    inkColor: inkColor,
                    correctAnswer: inkColor, // 文字色が正解
                    isCongruent: colorWord === inkColor,
                    category: 'COLOR_WORD'
                });
            }
        });
    });

    // 無意味語刺激（15試行）
    NONSENSE_WORDS.forEach((word, index) => {
        const inkColor = COLORS[index % 3]; // 5つずつ各色に割り当て
        stimuli.push({
            word: word,
            inkColor: inkColor,
            correctAnswer: 'OTHER', // 無意味語の正解は常に"OTHER"
            isCongruent: false, // 無意味語は常に不一致
            category: 'NONSENSE'
        });
    });
    return stimuli;
}

/**
 * ブロック分の刺激セットを生成
 * 
 * デフォルトは実験設定の試行数（従来は60試行）。設定値が60を超える場合は
 * バランスの取れた60試行のセットを繰り返し、余り分はランダムサンプルで補う。
 */
export function generateBlockStimuli(targetCount = experimentConfig.trialsPerBlock): StroopStimulus[] {
    if (targetCount <= 0) return [];

    const baseStimuli = buildBaseStimuliSet();
    const fullSets = Math.floor(targetCount / baseStimuli.length);
    const remainder = targetCount % baseStimuli.length;

    const stimuli: StroopStimulus[] = [];

    for (let i = 0; i < fullSets; i++) {
        stimuli.push(...shuffleArray(baseStimuli));
    }

    if (remainder > 0) {
        stimuli.push(...shuffleArray(baseStimuli).slice(0, remainder));
    }

    return shuffleWithoutImmediateRepeats(stimuli);
}

/**
 * 刺激セットの統計情報を取得
 */
export function getStimuliStats(stimuli: StroopStimulus[]) {
    const total = stimuli.length;
    const congruent = stimuli.filter(s => s.isCongruent).length;
    const incongruent = total - congruent;

    const byCorrectAnswer = {
        RED: stimuli.filter(s => s.correctAnswer === 'RED').length,
        BLUE: stimuli.filter(s => s.correctAnswer === 'BLUE').length,
        GREEN: stimuli.filter(s => s.correctAnswer === 'GREEN').length,
        OTHER: stimuli.filter(s => s.correctAnswer === 'OTHER').length,
    };

    const byInkColor = {
        RED: stimuli.filter(s => s.inkColor === 'RED').length,
        BLUE: stimuli.filter(s => s.inkColor === 'BLUE').length,
        GREEN: stimuli.filter(s => s.inkColor === 'GREEN').length,
    };

    const byCategory = {
        COLOR_WORD: stimuli.filter(s => s.category === 'COLOR_WORD').length,
        NONSENSE: stimuli.filter(s => s.category === 'NONSENSE').length,
    };

    return {
        total,
        congruent,
        incongruent,
        congruentRatio: congruent / total,
        byCorrectAnswer,
        byInkColor,
        byCategory,
    };
}

/**
 * 刺激セットが仕様通りかバリデーション
 */
export function validateStimuliSet(stimuli: StroopStimulus[]): boolean {
    const stats = getStimuliStats(stimuli);

    if (stats.total !== experimentConfig.trialsPerBlock) {
        return false;
    }

    // 従来仕様（60試行）のみ細かなバランスチェックを行う
    if (experimentConfig.trialsPerBlock === 60) {
        if (stats.byCorrectAnswer.RED !== 15) return false;
        if (stats.byCorrectAnswer.BLUE !== 15) return false;
        if (stats.byCorrectAnswer.GREEN !== 15) return false;
        if (stats.byCorrectAnswer.OTHER !== 15) return false;

        if (stats.byInkColor.RED !== 20) return false;
        if (stats.byInkColor.BLUE !== 20) return false;
        if (stats.byInkColor.GREEN !== 20) return false;

        if (stats.byCategory.COLOR_WORD !== 45) return false;
        if (stats.byCategory.NONSENSE !== 15) return false;

        if (stats.congruent !== 15) return false;
        if (stats.incongruent !== 45) return false;
    }

    return true;
}

/**
 * デバッグ用：刺激セットの詳細を表示
 */
export function logStimuliDetails(stimuli: StroopStimulus[]) {
    const stats = getStimuliStats(stimuli);

    console.log('=== Stimuli Set Details ===');
    console.log(`Total: ${stats.total}`);
    console.log(`Congruent: ${stats.congruent} (${(stats.congruentRatio * 100).toFixed(1)}%)`);
    console.log(`Incongruent: ${stats.incongruent} (${((1 - stats.congruentRatio) * 100).toFixed(1)}%)`);
    console.log('\nBy Correct Answer:');
    Object.entries(stats.byCorrectAnswer).forEach(([answer, count]) => {
        console.log(`  ${answer}: ${count}`);
    });
    console.log('\nBy Ink Color:');
    Object.entries(stats.byInkColor).forEach(([color, count]) => {
        console.log(`  ${color}: ${count}`);
    });
    console.log('\nBy Category:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
    });
    console.log(`\nValidation: ${validateStimuliSet(stimuli) ? 'PASS' : 'FAIL'}`);
}
