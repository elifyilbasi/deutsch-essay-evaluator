import { GoogleGenAI, Type } from "@google/genai";
import { scoreFromBands } from "@/lib/rubrics/types";
import type { BandLetter, LevelRubric } from "@/lib/rubrics/types";

/** What the examiner model returns for one criterion, before scoring is applied. */
export type CriterionVerdict = {
  key: string;
  band: BandLetter;
  comment: string;
};

/** A scored criterion, after the band has been converted to points server-side. */
export type CriterionScore = {
  key: string;
  label: string;
  band: BandLetter;
  bandDescriptor: string;
  score: number;
  maxScore: number;
  comment: string;
};

export type Correction = {
  original: string;
  corrected: string;
  explanation: string;
};

export type LeitpunktCoverage = {
  leitpunkt: string;
  status: "ADDRESSED" | "PARTIAL" | "MISSING";
  comment: string;
};

/** Raw examiner judgement from the model — no arithmetic, no totals. */
export type ExaminerVerdict = {
  themaVerfehlt: boolean;
  leitpunktCoverage: LeitpunktCoverage[];
  criteriaVerdicts: CriterionVerdict[];
  bonusPointsSuggested: number;
  bonusJustification: string;
  corrections: Correction[];
  summaryFeedback: string;
};

/** Everything the evaluator needs to know about the task being answered. */
export type TaskContext = {
  institute: string;
  level: string;
  promptTitle: string;
  taskIntro: string;
  stimulusText: string | null;
  stimulusAuthor: string | null;
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  requiresSubject: boolean;
  rubric: LevelRubric;
  essay: string;
  wordCount: number;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    themaVerfehlt: {
      type: Type.BOOLEAN,
      description:
        "True only if the text misses the topic entirely (Thema verfehlt) - i.e. it is not a response to this task at all. This zeroes the whole letter, so reserve it for genuine cases.",
    },
    leitpunktCoverage: {
      type: Type.ARRAY,
      description:
        "One entry per Leitpunkt of the task, in the same order they were given. Judge each one independently.",
      items: {
        type: Type.OBJECT,
        properties: {
          leitpunkt: {
            type: Type.STRING,
            description: "The Leitpunkt being judged, copied verbatim from the task.",
          },
          status: {
            type: Type.STRING,
            enum: ["ADDRESSED", "PARTIAL", "MISSING"],
            description:
              "ADDRESSED = covered with adequate detail for this level. PARTIAL = mentioned but too thin. MISSING = not covered at all.",
          },
          comment: {
            type: Type.STRING,
            description:
              "One sentence in English explaining the judgement, quoting the relevant part of the essay where helpful.",
          },
        },
        required: ["leitpunkt", "status", "comment"],
      },
    },
    criteriaVerdicts: {
      type: Type.ARRAY,
      description:
        "One entry per evaluation criterion, using the criterion keys given in the prompt. Choose the single band whose descriptor best fits; do not invent intermediate grades.",
      items: {
        type: Type.OBJECT,
        properties: {
          key: {
            type: Type.STRING,
            description: "The criterion key exactly as given in the prompt.",
          },
          band: {
            type: Type.STRING,
            enum: ["A", "B", "C", "D"],
            description: "The band whose descriptor best matches the letter.",
          },
          comment: {
            type: Type.STRING,
            description:
              "1-3 sentences in English justifying this band, referring to the band descriptor.",
          },
        },
        required: ["key", "band", "comment"],
      },
    },
    bonusPointsSuggested: {
      type: Type.NUMBER,
      description:
        "Zusatzpunkte (0-2): one for above-average linguistic range (vocabulary, structures), one for above-average scope of content. Report what the text merits; eligibility rules are enforced separately.",
    },
    bonusJustification: {
      type: Type.STRING,
      description: "One sentence in English explaining the Zusatzpunkte judgement.",
    },
    corrections: {
      type: Type.ARRAY,
      description:
        "Grammar, spelling, and word-choice corrections found in the essay, in the order they appear.",
      items: {
        type: Type.OBJECT,
        properties: {
          original: {
            type: Type.STRING,
            description: "The erroneous phrase or sentence, in German, exactly as written.",
          },
          corrected: { type: Type.STRING, description: "The corrected version, in German." },
          explanation: {
            type: Type.STRING,
            description: "Brief explanation of the error, in English.",
          },
        },
        required: ["original", "corrected", "explanation"],
      },
    },
    summaryFeedback: {
      type: Type.STRING,
      description:
        "3-5 sentences of overall prose feedback in English: strengths, main weaknesses, and one or two concrete tips to improve.",
    },
  },
  required: [
    "themaVerfehlt",
    "leitpunktCoverage",
    "criteriaVerdicts",
    "bonusPointsSuggested",
    "bonusJustification",
    "corrections",
    "summaryFeedback",
  ],
};

function buildPrompt(task: TaskContext) {
  const {
    institute,
    level,
    promptTitle,
    taskIntro,
    stimulusText,
    stimulusAuthor,
    instructions,
    leitpunkte,
    register,
    requiresSubject,
    rubric,
    essay,
    wordCount,
  } = task;

  const criteriaText = rubric.criteria
    .map((c, i) => {
      const bandLines = c.bands
        .map((b) => `     ${b.band} (${b.points} Punkte): ${b.descriptor}`)
        .join("\n");
      return `${i + 1}. key="${c.key}" — ${c.label}\n   ${c.description}\n   Bands:\n${bandLines}${
        c.zeroesWholeTask
          ? "\n   NOTE: grading this criterion D scores the entire letter 0."
          : ""
      }`;
    })
    .join("\n\n");

  const leitpunkteText = leitpunkte.map((p, i) => `${i + 1}. ${p}`).join("\n");

  const stimulusBlock = stimulusText
    ? `\nINCOMING LETTER THE STUDENT IS REPLYING TO${
        stimulusAuthor ? ` (written by ${stimulusAuthor})` : ""
      }:\n"""\n${stimulusText}\n"""\n`
    : "";

  const registerText =
    register === "SIE"
      ? 'The task requires the FORMAL register ("Sie"). Using "du" is a communicative-design error.'
      : 'The task requires the INFORMAL register ("du"). Using "Sie" is a communicative-design error.';

  const subjectText = requiresSubject
    ? "The task requires a subject line (Betreff). Note whether one is present and informative."
    : "No subject line (Betreff) is required for this task.";

  const salutationText = stimulusAuthor
    ? `The reply should address ${stimulusAuthor} by name in the salutation.`
    : "";

  return `You are an experienced examiner for the ${institute} German exam, writing section (Schriftlicher Ausdruck), level ${level}.

TASK GIVEN TO THE STUDENT
Title: ${promptTitle}
Intro: ${taskIntro}
${stimulusBlock}
Instruction: ${instructions}

THE LEITPUNKTE (content points) THE STUDENT MUST COVER:
${leitpunkteText}

FORMAL REQUIREMENTS:
- ${registerText}
- ${subjectText}
${salutationText ? `- ${salutationText}\n` : ""}- Expected length: ${rubric.minWords}-${rubric.maxWords} words. The student wrote ${wordCount} words.

LEVEL-SPECIFIC GUIDANCE FOR YOU AS EXAMINER:
${rubric.guidance}

EVALUATION CRITERIA:
${criteriaText}

STUDENT'S ESSAY (German, submitted as-is, do not alter before analysis):
"""
${essay}
"""

ZUSATZPUNKTE:
${rubric.bonusGuidance}

Work in this order:
1. Decide whether the text misses the topic entirely (themaVerfehlt). This is rare — only for a text that is not an answer to this task at all.
2. Go through the Leitpunkte one at a time, in the order listed above, and decide for each whether the essay treats it adequately (ADDRESSED), only touches it (PARTIAL), or omits it (MISSING). Return one entry per Leitpunkt, copying its text verbatim. Do not merge or reorder them.
3. For each criterion, pick the ONE band (A, B, C or D) whose descriptor best fits, and return it under that criterion's key. For the Leitpunkte criterion, count how many points you marked ADDRESSED and choose the band that matches that count — PARTIAL does not count as adequately treated.
4. Suggest Zusatzpunkte (0-2) with a one-sentence justification.
5. List concrete grammar, spelling, and word-choice errors as corrections (original -> corrected, each with a short explanation).
6. Write a brief overall prose feedback summary.

Do NOT compute totals, percentages, or a final score — the points are derived from your bands automatically. Apply the standards of level ${level} only, neither a higher nor a lower level. Be constructive and specific. Respond only with the JSON described by the response schema.`;
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

/** The finished evaluation: examiner judgement plus the score derived from it. */
export type EvaluationResult = {
  overallScore: number;
  maxScore: number;
  rawScore: number;
  bonusPoints: number;
  zeroedReason: string | null;
  resultLabel: string;
  criteriaScores: CriterionScore[];
  leitpunktCoverage: LeitpunktCoverage[];
  corrections: Correction[];
  summaryFeedback: string;
};

/** Qualitative label for a writing score; telc pass/fail is decided across the whole exam. */
function buildResultLabel(params: {
  level: string;
  total: number;
  maxTotal: number;
  zeroedReason: string | null;
}): string {
  const { level, total, maxTotal, zeroedReason } = params;
  if (zeroedReason) {
    return `${level} — 0/${maxTotal} (${zeroedReason})`;
  }
  const pct = maxTotal === 0 ? 0 : (total / maxTotal) * 100;
  const descriptor =
    pct >= 90 ? "sehr gut" : pct >= 80 ? "gut" : pct >= 70 ? "befriedigend" : pct >= 60 ? "ausreichend" : "nicht ausreichend";
  return `${level} — ${total}/${maxTotal} (${descriptor})`;
}

export async function evaluateEssay(
  task: TaskContext,
): Promise<{
  result: EvaluationResult;
  verdict: ExaminerVerdict;
  raw: { model: string; text: string };
}> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(task),
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const verdict = JSON.parse(text) as ExaminerVerdict;
  const { rubric, level } = task;

  const bands = Object.fromEntries(
    (verdict.criteriaVerdicts ?? []).map((v) => [v.key, v.band]),
  ) as Record<string, BandLetter>;

  const breakdown = scoreFromBands({
    rubric,
    bands,
    bonusPoints: verdict.bonusPointsSuggested ?? 0,
    themaVerfehlt: Boolean(verdict.themaVerfehlt),
  });

  const criteriaScores: CriterionScore[] = rubric.criteria.map((criterion) => {
    const chosen = bands[criterion.key];
    const band = criterion.bands.find((b) => b.band === chosen) ?? criterion.bands.at(-1)!;
    const comment =
      verdict.criteriaVerdicts?.find((v) => v.key === criterion.key)?.comment ?? "";
    return {
      key: criterion.key,
      label: criterion.label,
      band: band.band,
      bandDescriptor: band.descriptor,
      // A zeroing rule voids the individual criterion points too, matching the mark sheet.
      score: breakdown.zeroedReason ? 0 : band.points,
      maxScore: Math.max(...criterion.bands.map((b) => b.points)),
      comment,
    };
  });

  return {
    result: {
      overallScore: breakdown.total,
      maxScore: breakdown.maxTotal,
      rawScore: breakdown.raw,
      bonusPoints: breakdown.bonusApplied,
      zeroedReason: breakdown.zeroedReason,
      resultLabel: buildResultLabel({
        level,
        total: breakdown.total,
        maxTotal: breakdown.maxTotal,
        zeroedReason: breakdown.zeroedReason,
      }),
      criteriaScores,
      leitpunktCoverage: verdict.leitpunktCoverage ?? [],
      corrections: verdict.corrections ?? [],
      summaryFeedback: verdict.summaryFeedback ?? "",
    },
    verdict,
    raw: { model, text },
  };
}
