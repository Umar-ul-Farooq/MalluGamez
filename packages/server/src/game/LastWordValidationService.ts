import { GoogleGenAI, Type } from '@google/genai';
import type { LastWordQuestion } from './LastWordBank';

export type ValidationOutcomeStatus =
  | 'TARGET_HIT'
  | 'VALID'
  | 'INVALID'
  | 'UNCERTAIN'
  | 'API_ERROR';

export interface ValidationResult {
  status: ValidationOutcomeStatus;
  stage: 'target' | 'database' | 'deterministic' | 'ai' | 'cache';
  message: string;
  reason?: string;
}

export interface GeminiJsonAssessment {
  status: 'VALID' | 'INVALID' | 'UNCERTAIN';
  short_reason: string;
}

export type AiEvaluatorFn = (params: {
  questionPrompt: string;
  submittedAnswer: string;
  category: string;
  constraintsText: string;
}) => Promise<GeminiJsonAssessment>;

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const API_TIMEOUT_MS = 8000;
const MAX_CACHE_ENTRIES = 2000;

/**
 * Curated phonetic rhyme families (pronunciation-aware, not mere spelling similarity)
 */
const PHONETIC_RHYME_FAMILIES: Record<string, string[]> = {
  shower: ['power', 'tower', 'flower', 'hour', 'flour', 'sour', 'devour', 'cower', 'glower', 'scour', 'dour', 'empower'],
  light: ['bright', 'fight', 'sight', 'might', 'right', 'tight', 'night', 'kite', 'bite', 'white', 'flight', 'knight', 'height', 'write', 'spite'],
  cake: ['bake', 'lake', 'make', 'take', 'wake', 'shake', 'brake', 'fake', 'steak', 'break', 'rake', 'snake', 'ache', 'awake', 'quake'],
  rain: ['pain', 'brain', 'chain', 'main', 'plain', 'stain', 'drain', 'plane', 'crane', 'lane', 'gain', 'train', 'vain', 'vein', 'champagne'],
  blue: ['shoe', 'glue', 'clue', 'true', 'crew', 'drew', 'flew', 'grew', 'new', 'two', 'zoo', 'kangaroo', 'bamboo', 'canoe', 'flu', 'through', 'view'],
  boat: ['coat', 'float', 'throat', 'note', 'vote', 'remote', 'oat', 'moat', 'goat', 'quote', 'wrote', 'promote'],
  star: ['car', 'bar', 'jar', 'far', 'guitar', 'tar', 'scar', 'cigar', 'par', 'bizarre'],
  chair: ['hair', 'pair', 'fair', 'stair', 'air', 'care', 'pear', 'share', 'wear', 'bear', 'square', 'rare', 'dare', 'flare', 'prayer'],
};

/**
 * Safe, deterministic answer normalization:
 * - Converts to lowercase
 * - Removes leading/trailing spaces & collapses repeated spaces
 * - Strips punctuation without aggressive stemming/fuzzy merging
 * - Preserves English letters, numbers, and Malayalam Unicode characters
 */
export function normalizeLastWordAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,!?;:'"`~_\-()[\]{}/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class LastWordValidationService {
  private cache = new Map<string, GeminiJsonAssessment>();
  private aiClient: GoogleGenAI | null = null;
  private customEvaluator?: AiEvaluatorFn;
  private timeoutMs: number;
  private missingKeyLogged = false;

  constructor(options?: { customEvaluator?: AiEvaluatorFn; timeoutMs?: number }) {
    this.customEvaluator = options?.customEvaluator;
    this.timeoutMs = options?.timeoutMs ?? API_TIMEOUT_MS;
  }

  private getModelName(): string {
    return (process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
  }

  private getAiClient(): GoogleGenAI | null {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      if (!this.missingKeyLogged) {
        console.error('[LastWordValidation] GEMINI_API_KEY is missing. Stage 3 AI validation will fail gracefully until configured.');
        this.missingKeyLogged = true;
      }
      return null;
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  clearCache() {
    this.cache.clear();
  }

  async validateAnswer(question: LastWordQuestion, rawAnswer: string): Promise<ValidationResult> {
    const normalized = normalizeLastWordAnswer(rawAnswer);
    if (!normalized) {
      return {
        status: 'INVALID',
        stage: 'deterministic',
        message: 'Not quite! Try another answer.',
        reason: 'Empty submission.',
      };
    }

    // ── STAGE 1: Secret Target Comparison (Server-only, highest priority) ──
    const targetVariants = [question.secretTarget, ...(question.targetAlternatives || [])]
      .map(normalizeLastWordAnswer)
      .filter(Boolean);

    if (targetVariants.includes(normalized)) {
      return {
        status: 'TARGET_HIT',
        stage: 'target',
        message: 'Boom! You hit the Secret Target!',
      };
    }

    // ── STAGE 2A: Local Database Validation ──
    const knownValid = (question.knownValidAnswers || []).map(normalizeLastWordAnswer);
    if (knownValid.includes(normalized)) {
      return {
        status: 'VALID',
        stage: 'database',
        message: "You're safe! Next player's turn.",
        reason: 'Matched known valid answer in database.',
      };
    }

    const knownInvalid = (question.knownInvalidAnswers || []).map(normalizeLastWordAnswer);
    if (knownInvalid.includes(normalized)) {
      return {
        status: 'INVALID',
        stage: 'database',
        message: 'Not quite! Try another answer.',
        reason: 'Matched known invalid example.',
      };
    }

    // ── STAGE 2B: Deterministic Objective Constraint Checks ──
    const detResult = this.evaluateDeterministic(question, normalized);
    if (detResult) {
      return detResult;
    }

    // ── STAGE 3: Cached AI Result or Live Gemini API Validation ──
    const cacheKey = `${question.id}::${normalized}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return this.mapAiAssessmentToResult(cached, 'cache');
    }

    const aiAssessment = await this.callGeminiSafely(question, rawAnswer.trim());
    if (!aiAssessment) {
      return {
        status: 'API_ERROR',
        stage: 'ai',
        message: 'Answer verification is temporarily unavailable. Please try again.',
        reason: 'AI service unavailable or returned invalid data.',
      };
    }

    // Cache valid/invalid results cleanly (do not cache UNCERTAIN or errors)
    if (aiAssessment.status === 'VALID' || aiAssessment.status === 'INVALID') {
      if (this.cache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(cacheKey, aiAssessment);
    }

    return this.mapAiAssessmentToResult(aiAssessment, 'ai');
  }

  private evaluateDeterministic(
    question: LastWordQuestion,
    normalized: string
  ): ValidationResult | null {
    const c = question.constraints;
    if (!c) return null;

    // 1. Word-length / starting / ending letter objective constraints
    if (c.exactLength !== undefined) {
      if (normalized.includes(' ') || !/^[a-z0-9]+$/.test(normalized)) {
        return {
          status: 'INVALID',
          stage: 'deterministic',
          message: 'Not quite! Try another answer.',
          reason: `Expected a single ${c.exactLength}-letter word.`,
        };
      }
      if (normalized.length !== c.exactLength) {
        return {
          status: 'INVALID',
          stage: 'deterministic',
          message: 'Not quite! Try another answer.',
          reason: `Word has ${normalized.length} letters, expected ${c.exactLength}.`,
        };
      }
    }

    if (c.startsWith) {
      const prefix = c.startsWith.toLowerCase();
      if (!normalized.startsWith(prefix)) {
        return {
          status: 'INVALID',
          stage: 'deterministic',
          message: 'Not quite! Try another answer.',
          reason: `Word must start with "${c.startsWith.toUpperCase()}".`,
        };
      }
    }

    if (c.endsWith) {
      const suffix = c.endsWith.toLowerCase();
      if (!normalized.endsWith(suffix)) {
        return {
          status: 'INVALID',
          stage: 'deterministic',
          message: 'Not quite! Try another answer.',
          reason: `Word must end with "${c.endsWith.toUpperCase()}".`,
        };
      }
    }

    // 2. Pronunciation-aware rhyme evaluation
    if (question.questionType === 'rhyming' && c.rhymeTarget) {
      const targetNorm = normalizeLastWordAnswer(c.rhymeTarget);
      if (normalized === targetNorm) {
        return {
          status: 'INVALID',
          stage: 'deterministic',
          message: 'Not quite! Try another answer.',
          reason: 'Cannot repeat the rhyme prompt word itself.',
        };
      }

      const family = PHONETIC_RHYME_FAMILIES[targetNorm];
      if (family && family.includes(normalized)) {
        return {
          status: 'VALID',
          stage: 'deterministic',
          message: "You're safe! Next player's turn.",
          reason: `Verified rhyme with "${c.rhymeTarget}".`,
        };
      }

      // Obvious non-rhyme rejection when answer shares zero phonetic coda with rhyme target
      if (!this.couldPlausiblyRhyme(normalized, targetNorm)) {
        return {
          status: 'INVALID',
          stage: 'deterministic',
          message: 'Not quite! Try another answer.',
          reason: `Does not rhyme phonetically with "${c.rhymeTarget}".`,
        };
      }
    }

    // Constraints passed, or word requires contextual/real-word check -> fall back to Gemini
    return null;
  }

  private couldPlausiblyRhyme(word: string, target: string): boolean {
    if (word.includes(' ')) return false;
    // Extract trailing vowel+consonant coda from target & word
    const coda = (w: string) => {
      const m = w.match(/[aeiouy]+[^aeiouy]*$/);
      return m ? m[0] : w.slice(-2);
    };
    const c1 = coda(word);
    const c2 = coda(target);
    if (c1 === c2) return true;
    // Allow known phonetic equivalents (e.g., shower / hour / flour -> -our/-ower; blue / shoe -> -ue/-oo/-ew/-oe; rain / plane -> -ain/-ane)
    if (target.endsWith('ower') && (word.endsWith('our') || word.endsWith('ower'))) return true;
    if (target.endsWith('ight') && (word.endsWith('ite') || word.endsWith('ight'))) return true;
    if (target.endsWith('ake') && (word.endsWith('ake') || word.endsWith('eak'))) return true;
    if (target.endsWith('ain') && (word.endsWith('ain') || word.endsWith('ane'))) return true;
    if (target.endsWith('lue') && /(ue|oo|ew|oe|ough)$/.test(word)) return true;
    if (target.endsWith('oat') && (word.endsWith('oat') || word.endsWith('ote'))) return true;
    if (target.endsWith('air') && (word.endsWith('air') || word.endsWith('are') || word.endsWith('ear'))) return true;
    // If last 2 chars match, allow Gemini to decide
    return word.slice(-2) === target.slice(-2);
  }

  private mapAiAssessmentToResult(
    assessment: GeminiJsonAssessment,
    stage: 'ai' | 'cache'
  ): ValidationResult {
    if (assessment.status === 'VALID') {
      return {
        status: 'VALID',
        stage,
        message: "You're safe! Next player's turn.",
        reason: assessment.short_reason,
      };
    }
    if (assessment.status === 'INVALID') {
      return {
        status: 'INVALID',
        stage,
        message: 'Not quite! Try another answer.',
        reason: assessment.short_reason,
      };
    }
    return {
      status: 'UNCERTAIN',
      stage,
      message: "Couldn't verify that answer. Try another.",
      reason: assessment.short_reason,
    };
  }

  private buildConstraintsDescription(question: LastWordQuestion): string {
    const parts: string[] = [];
    const c = question.constraints;
    if (c?.exactLength) parts.push(`Must be a single real word with exact length ${c.exactLength} letters.`);
    if (c?.startsWith) parts.push(`Must start with letter "${c.startsWith.toUpperCase()}".`);
    if (c?.endsWith) parts.push(`Must end with letter "${c.endsWith.toUpperCase()}".`);
    if (c?.rhymeTarget) parts.push(`Must genuinely rhyme with "${c.rhymeTarget}".`);
    if (c?.categoryRequirement) parts.push(`Must belong to category: ${c.categoryRequirement}.`);
    return parts.join(' ') || 'None beyond the question prompt.';
  }

  private async callGeminiSafely(
    question: LastWordQuestion,
    submittedAnswer: string
  ): Promise<GeminiJsonAssessment | null> {
    const constraintsText = this.buildConstraintsDescription(question);

    try {
      let parsed: any;

      if (this.customEvaluator) {
        parsed = await this.withTimeout(
          this.customEvaluator({
            questionPrompt: question.prompt,
            submittedAnswer,
            category: question.category,
            constraintsText,
          }),
          this.timeoutMs
        );
      } else {
        const client = this.getAiClient();
        if (!client) return null;

        const systemInstruction = [
          'You are an answer validator for a fast-paced party word game.',
          'Evaluate ONLY whether the submitted answer genuinely satisfies the question and constraints.',
          'Rules:',
          '1. Determine whether the answer genuinely satisfies the question.',
          '2. Accept legitimate uncommon and regional answers (e.g. Indian/Kerala dishes like Idli, Dosa, Appam, Puttu).',
          '3. Accept reasonable cultural and food variations.',
          '4. Accept alternative names where appropriate.',
          '5. Reject unrelated answers.',
          '6. Reject nonsense, gibberish, and deliberately evasive responses.',
          '7. Respect any exact length, starting/ending letter, or rhyming constraints.',
          '8. Avoid being overly strict when an answer is reasonable.',
          'Respond strictly as JSON with keys "status" (VALID | INVALID | UNCERTAIN) and "short_reason".',
        ].join('\n');

        const userContent = [
          `Question: ${question.prompt}`,
          `Category: ${question.category}`,
          `Constraints: ${constraintsText}`,
          `Submitted Answer: ${submittedAnswer}`,
        ].join('\n');

        const response = await this.withTimeout(
          client.models.generateContent({
            model: this.getModelName(),
            contents: userContent,
            config: {
              systemInstruction,
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  status: {
                    type: Type.STRING,
                    enum: ['VALID', 'INVALID', 'UNCERTAIN'],
                  },
                  short_reason: {
                    type: Type.STRING,
                  },
                },
                required: ['status', 'short_reason'],
              },
            },
          }),
          this.timeoutMs
        );

        const rawText = (response as any)?.text;
        if (typeof rawText !== 'string' || !rawText.trim()) {
          console.error('[LastWordValidation] Gemini returned empty response text');
          return null;
        }
        parsed = JSON.parse(rawText);
      }

      // Strictly validate JSON structure before accepting it
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !['VALID', 'INVALID', 'UNCERTAIN'].includes(parsed.status) ||
        typeof parsed.short_reason !== 'string'
      ) {
        console.error('[LastWordValidation] Invalid JSON schema from Gemini:', parsed);
        return null;
      }

      console.log(`[LastWordValidation] AI evaluated "${submittedAnswer}" for ${question.id}: ${parsed.status}`);
      return {
        status: parsed.status,
        short_reason: parsed.short_reason,
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`[LastWordValidation] Gemini validation error for ${question.id}:`, msg);
      return null;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms);
      promise.then(
        val => {
          clearTimeout(timer);
          resolve(val);
        },
        err => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }
}
