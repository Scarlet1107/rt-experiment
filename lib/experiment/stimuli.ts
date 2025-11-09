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

/**
 * 完全にバランスされた60試行の刺激セットを生成
 * 
 * 構成:
 * - レッド回答: 15試行 (赤色文字5, 青色文字5, 緑色文字5)
 * - ブルー回答: 15試行 (赤色文字5, 青色文字5, 緑色文字5)
 * - グリーン回答: 15試行 (赤色文字5, 青色文字5, 緑色文字5)
 * - アザー回答: 15試行 (赤色文字5, 青色文字5, 緑色文字5)
 */
export function generateBlockStimuli(): StroopStimulus[] {
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

    // ランダムに並び替え（ブロックごとに異なる順序）
    return shuffleArray(stimuli);
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

    // 総数チェック
    if (stats.total !== 60) return false;

    // 回答カテゴリ別の数チェック
    if (stats.byCorrectAnswer.RED !== 15) return false;
    if (stats.byCorrectAnswer.BLUE !== 15) return false;
    if (stats.byCorrectAnswer.GREEN !== 15) return false;
    if (stats.byCorrectAnswer.OTHER !== 15) return false;

    // 文字色別の数チェック
    if (stats.byInkColor.RED !== 20) return false;
    if (stats.byInkColor.BLUE !== 20) return false;
    if (stats.byInkColor.GREEN !== 20) return false;

    // カテゴリ別の数チェック
    if (stats.byCategory.COLOR_WORD !== 45) return false;
    if (stats.byCategory.NONSENSE !== 15) return false;

    // 一致/不一致の数チェック
    if (stats.congruent !== 15) return false; // 3色 × 5試行
    if (stats.incongruent !== 45) return false;

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
