import { Translations } from './ja';

export const en: Translations = {
    languageSelector: {
        title: "Select Language",
        subtitle: "Please select the language for the experiment",
        japanese: "日本語",
        english: "English",
        continue: "Continue"
    },

    consent: {
        title: "Research Consent Form",
        content: `This research aims to investigate the effects of feedback in Stroop tasks.

Your participation is completely voluntary and you may withdraw at any time.

The collected data will:
• Be used only for research
• Never be shared in a way that identifies individuals
• Use AI (OpenAI API) to create feedback, but not for training

Duration: Approximately 20 minutes (including practice)
Content: You will perform tasks judging the color of displayed text`,
        agree: "I agree to participate",
        disagree: "I do not wish to participate"
    },

    survey: {
        title: "Pre-experiment Survey",
        subtitle: "Please answer a few questions for personalized feedback",
        nickname: "Preferred name (nickname)",
        nicknamePlaceholder: "e.g., Alex, Sam, etc.",
        nicknameHelper: "This name will appear inside feedback messages.",
        preferredPraise: "Preferred praise/encouragement style",
        preferredPraiseHint: "Select as many styles as you like.",
        preferredPraisePlaceholder: "e.g., Great job!, You're doing well!",
        toneQuestionTitle: "What tone keeps you motivated during the experiment?",
        toneQuestionDescription: "Pick the option that fits you best.",
        motivationQuestionTitle: "How would you like to be encouraged when it’s tough?",
        motivationQuestionDescription: "Choose one encouragement style.",
        evaluationQuestionTitle: "What kind of evaluation motivates you?",
        evaluationQuestionDescription: "Select the feedback focus you prefer.",
        continue: "Continue"
    },

    instructions: {
        title: "Experiment Instructions",
        description: `You will now perform a task judging the color of text.

Please focus on the color of the text, not the meaning of the word.
Press the corresponding key for the displayed text color as quickly and accurately as possible.`,
        keyMapping: {
            title: "Key Mapping",
            red: "Red",
            green: "Green",
            blue: "Blue",
            other: "Other"
        },
        startButton: "Start Practice"
    },

    practice: {
        title: "Practice",
        description: "Let's start with practice. Once you're comfortable, proceed to the main experiment.",
        trial: "Practice",
        correct: "Right",
        incorrect: "Wrong",
        continueToMain: "Start Main Experiment",
        continePractice: "Continue Practice",
        backToInstructions: "Back to Instructions"
    },

    experiment: {
        block: "Block",
        trial: "Trial",
        correct: "Right",
        incorrect: "Wrong",
        break: "Break",
        breakMessage: "Great job! Please take a short break. When ready, proceed to the next block.",
        continue: "Next Block"
    },

    feedback: {
        static: {
            blockResult: "Block {block} Results",
            averageRT: "Average Response Time: {rt}ms",
            accuracy: "Accuracy: {accuracy}%",
            comparison: "Comparison with Previous Block",
            rtChange: "Response Time: {change}ms",
            accuracyChange: "Accuracy: {change}%"
        }
    },

    completion: {
        title: "Experiment Complete",
        message: "Congratulations! You have completed the experiment.",
        nextSessionInfo: "Please complete the next session on a different day.",
        dataStatus: "Saving data...",
        dataSaved: "Data has been saved successfully.",
        downloadBackup: "Download Backup",
        goHome: "Go Home"
    },

    admin: {
        title: "Admin Dashboard",
        participants: "Participant Management",
        progress: "Progress Monitoring",
        export: "Data Export",
        generateUUID: "Generate New Participant UUID",
        staticURL: "Static Condition URL",
        personalizedURL: "Personalized Condition URL"
    },

    errors: {
        loadingFailed: "Failed to load data",
        savingFailed: "Failed to save data",
        networkError: "Network error occurred",
        retry: "Retry",
        downloadData: "Download Data"
    }
};
