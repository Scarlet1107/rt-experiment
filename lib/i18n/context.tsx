'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ja, Translations } from './ja';
import { en } from './en';

export type Language = 'ja' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'ja',
    setLanguage: () => { },
    t: ja,
});

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

interface LanguageProviderProps {
    children: ReactNode;
    initialLanguage?: Language;
}

export const LanguageProvider = ({ children, initialLanguage = 'ja' }: LanguageProviderProps) => {
    const [language, setLanguageState] = useState<Language>(initialLanguage);

    // ブラウザの localStorage から言語設定を復元
    useEffect(() => {
        const saved = localStorage.getItem('rt-experiment-language') as Language;
        if (saved && (saved === 'ja' || saved === 'en')) {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('rt-experiment-language', lang);
    };

    const translations = {
        ja,
        en,
    };

    const value = {
        language,
        setLanguage,
        t: translations[language],
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// 翻訳関数のヘルパー
export const interpolate = (template: string, values: Record<string, string | number>): string => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return values[key]?.toString() || match;
    });
};
