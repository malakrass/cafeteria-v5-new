import { useState, useEffect, useContext, createContext, ReactNode } from 'react';

interface TranslationContextType {
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLanguage: (lang: string) => void;
  language: string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
}

const translations: Record<string, Record<string, string>> = {};

export const TranslationProvider = ({ children, defaultLanguage = 'en' }: TranslationProviderProps) => {
  const [language, setLanguageState] = useState<string>(() => {
    // Try to get language from localStorage, then browser, then default
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferredLanguage') || navigator.language.split('-')[0] || defaultLanguage;
    }
    return defaultLanguage;
  });
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/src/locales/${language}.json`);
        if (!response.ok) {
          throw new Error(`Could not load translation file for ${language}`);
        }
        const data = await response.json();
        translations[language] = data; // Cache translations
        setMessages(data);
      } catch (error) {
        console.error(`Error loading translation for ${language}:`, error);
        // Fallback to default language if loading fails
        if (language !== defaultLanguage) {
          console.warn(`Falling back to default language: ${defaultLanguage}`);
          setLanguageState(defaultLanguage);
        } else {
          setMessages({}); // No translations available
        }
      }
    };

    if (translations[language]) {
      setMessages(translations[language]);
    } else {
      loadMessages();
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', language);
      document.documentElement.lang = language;
      // Set dir attribute for RTL languages
      document.documentElement.dir = (language === 'ar' || language === 'he') ? 'rtl' : 'ltr';
    }
  }, [language, defaultLanguage]);

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let message = messages[key] || key;
    if (vars) {
      for (const [varKey, varValue] of Object.entries(vars)) {
        message = message.replace(`{${varKey}}`, String(varValue));
      }
    }
    return message;
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    // Here you would also call a backend API to save the user's preference
    // For now, we'll just update localStorage and the state.
  };

  return (
    <TranslationContext.Provider value={{ t, setLanguage, language }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
