// Prompt API (Chrome LanguageModel) type declarations
interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

interface LanguageModelCreateOptions {
  expectedInputLanguages?: string[];
  expectedOutputLanguages?: string[];
}

declare const LanguageModel: {
  availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
};
