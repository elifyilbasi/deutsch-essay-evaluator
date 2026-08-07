import { GoogleGenAI, Type } from "@google/genai";
import { contentPointMarks, resolveBand, scoreFromBands } from "@/lib/rubrics/types";
import type {
  BandLetter,
  LeitpunktStatus,
  LevelRubric,
} from "@/lib/rubrics/types";

/** What the examiner model returns for one criterion, before scoring is applied. */
export type CriterionVerdict = {
  key: string;
  band: BandLetter;
  comment: string;
};

/**
 * A scored criterion, after the band has been converted to points server-side.
 * `band` is absent for content marks awarded per Inhaltspunkt (telc A1), which are
 * a sum of per-Leitpunkt marks rather than one banded judgement.
 */
export type CriterionScore = {
  key: string;
  label: string;
  band?: BandLetter;
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
  status: LeitpunktStatus;
  comment: string;
  /**
   * True for an aspect the candidate brought themselves rather than one printed on the
   * task. telc B2 lets a letter treat two printed Punkte plus "einen weiteren Aspekt
   * Ihrer Wahl", so without this the coverage list would report a correct answer as two
   * missing Leitpunkte. Absent at levels whose rubric declares no `selfChosenAspects`.
   */
  selfChosen?: boolean;
};

/** Raw examiner judgement from the model — no arithmetic, no totals. */
export type ExaminerVerdict = {
  themaVerfehlt: boolean;
  leitpunktCoverage: LeitpunktCoverage[];
  criteriaVerdicts: CriterionVerdict[];
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

/**
 * Built per rubric rather than shared, because the schema descriptions are
 * instructions in their own right: a static one sent B1's rules ("this zeroes the
 * whole letter", B1's reading of the coverage statuses) along
 * with every A1 request, contradicting the prompt in the same call.
 */
/** The level's own wording for the coverage statuses, if it states one. */
function statusWording(
  rubric: LevelRubric,
): Record<LeitpunktStatus, string> | null {
  return (
    rubric.contentPointScoring?.descriptors ??
    rubric.leitpunktStatusGuidance ??
    null
  );
}

export function buildResponseSchema(rubric: LevelRubric) {
  const statuses = statusWording(rubric);
  return {
    type: Type.OBJECT,
    properties: {
      themaVerfehlt: {
        type: Type.BOOLEAN,
        // The Situierung caveat matters wherever a level draws that distinction: telc B1
        // and B2 both grade the first criterion D for a text on the right topic in the
        // wrong situation, WITHOUT zeroing the rest. Conflating the two here would turn a
        // partial loss into a nil score.
        description: `True only if the text misses the topic entirely (Thema verfehlt) - i.e. it is not a response to this task at all.${
          rubric.themaVerfehltZeroesTask
            ? " This zeroes the whole letter, so reserve it for genuine cases. A text that takes up the right topic but answers the wrong Situierung is NOT Thema verfehlt: leave this false and grade the task-achievement criterion D instead, so the language criteria still count."
            : " At this level it carries no automatic penalty; it is recorded, not scored."
        }`,
      },
      leitpunktCoverage: {
        type: Type.ARRAY,
        description: rubric.selfChosenAspects
          ? `One entry per Leitpunkt of the task, in the same order they were given, judged independently. THEN, if the letter develops a further relevant aspect of its own that is not one of the printed Leitpunkte, append one entry for it with selfChosen=true. ${rubric.selfChosenAspects.guidance}`
          : "One entry per Leitpunkt of the task, in the same order they were given. Judge each one independently.",
        items: {
          type: Type.OBJECT,
          properties: {
            leitpunkt: {
              type: Type.STRING,
              description: rubric.selfChosenAspects
                ? "The Leitpunkt being judged, copied verbatim from the task — or, for a self-chosen aspect, a short German noun phrase naming the aspect the candidate raised."
                : "The Leitpunkt being judged, copied verbatim from the task.",
            },
            ...(rubric.selfChosenAspects
              ? {
                  selfChosen: {
                    type: Type.BOOLEAN,
                    description:
                      "True only for an aspect the candidate chose themselves, which is not printed on the task. False or omitted for every printed Leitpunkt.",
                  },
                }
              : {}),
            status: {
              type: Type.STRING,
              enum: ["ADDRESSED", "PARTIAL", "MISSING"],
              // Where content is marked per Inhaltspunkt these statuses ARE the score,
              // so they must carry the institute's own wording, not a generic gloss.
              description: statuses
                ? `ADDRESSED = "${statuses.ADDRESSED}". PARTIAL = "${statuses.PARTIAL}". MISSING = "${statuses.MISSING}".`
                : "ADDRESSED = covered with adequate detail for this level. PARTIAL = mentioned but too thin. MISSING = not covered at all.",
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
              // Only the letters this rubric actually defines: telc A1's single
              // criterion is a three-way 1 / 0,5 / 0, so offering D would let the
              // model pick a band that silently resolves to the harshest mark.
              enum: [
                ...new Set(
                  rubric.criteria.flatMap((c) => c.bands.map((b) => b.band)),
                ),
              ],
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
      corrections: {
        type: Type.ARRAY,
        description:
          "Grammar, spelling, and word-choice corrections found in the essay, in the order they appear.",
        items: {
          type: Type.OBJECT,
          properties: {
            original: {
              type: Type.STRING,
              description:
                "The erroneous phrase or sentence, in German, exactly as written.",
            },
            corrected: {
              type: Type.STRING,
              description: "The corrected version, in German.",
            },
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
      "corrections",
      "summaryFeedback",
    ],
  };
}

/** Exported so tests can diff a level's prompt without calling the model. */
export function buildPrompt(task: TaskContext) {
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

  const contentPoints = rubric.contentPointScoring;
  const promptStatuses = statusWording(rubric);
  // Where the institute marks each Inhaltspunkt separately, the per-Leitpunkt
  // statuses ARE the content score, so the model has to be told what each one is
  // worth - otherwise it treats them as commentary and grades content twice.
  const countedPoints = contentPoints?.counted ?? leitpunkte.length;
  // Where a task offers more points than are marked ("Wählen Sie drei aus"), the
  // model has to be told - otherwise it reads a skipped point as a failure and the
  // stated total contradicts the rubric's maximum.
  const choiceNote =
    contentPoints && countedPoints < leitpunkte.length
      ? `\n   The task prints ${leitpunkte.length} Leitpunkte but only ${countedPoints} are marked, and the candidate chooses which. Judge every Leitpunkt on its own merits anyway: the best ${countedPoints} are the ones that count, and a point left unanswered on purpose costs nothing.`
      : "";
  const contentPointText = contentPoints
    ? `CONTENT MARKS — ${contentPoints.label} (pro Inhaltspunkt)
   ${contentPoints.description}
   Each Leitpunkt is marked on its own, and its mark follows directly from the status you give it in step 2:
     ADDRESSED (${contentPoints.points.ADDRESSED} Punkte): ${contentPoints.descriptors.ADDRESSED}
     PARTIAL (${contentPoints.points.PARTIAL} Punkte): ${contentPoints.descriptors.PARTIAL}
     MISSING (${contentPoints.points.MISSING} Punkte): ${contentPoints.descriptors.MISSING}
   That is ${countedPoints} × ${contentPoints.points.ADDRESSED} = ${
     countedPoints * contentPoints.points.ADDRESSED
   } of the marks available, so these statuses decide almost the whole score. Weigh nothing else into them.${choiceNote}

`
    : "";

  // Where the candidate may substitute content of their own, saying so is what stops the
  // model reading a legitimate choice as two missing Leitpunkte and marking it down twice
  // — once in the coverage list the learner reads, once in Kriterium 1.
  const selfChosen = rubric.selfChosenAspects;
  const selfChosenText = selfChosen
    ? `COVERAGE RULE — the candidate may bring their own content
   ${selfChosen.guidance}
   So a letter treating ${selfChosen.minLeitpunkte} of the printed Leitpunkte plus ${
     selfChosen.expectedTotal - selfChosen.minLeitpunkte
   } relevant aspect(s) of its own has covered the task IN FULL. Do not treat the printed points it passed over as failures, and do not mark it down for choosing that option — the task offers it.
   Still judge each printed Leitpunkt on its own and report it, so the learner sees what was and was not taken up; then append any self-chosen aspect with selfChosen=true. Coverage is short only when fewer than ${selfChosen.expectedTotal} points in total, printed and self-chosen together, are properly treated.

`
    : "";

  // Every letter this rubric actually defines, in grid order, so the step list can never
  // offer a set that differs from the bands printed above it.
  const bandLetters = [
    ...new Set(rubric.criteria.flatMap((c) => c.bands.map((b) => b.band))),
  ].join(", ");

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

  // Named by what it actually is. A telc B1 task quotes a letter from a person and the
  // reply is addressed back to them; a B2 task reprints an advertisement, and calling
  // that "the letter the student is replying to" invents a correspondent — which is
  // precisely the wrong steer on a criterion that marks Textsorte and Register.
  const stimulusBlock = stimulusText
    ? `\n${
        stimulusAuthor
          ? `INCOMING LETTER THE STUDENT IS REPLYING TO (written by ${stimulusAuthor})`
          : "MATERIAL THE STUDENT IS RESPONDING TO (an advertisement or notice, not a letter from a correspondent)"
      }:\n"""\n${stimulusText}\n"""\n`
    : "";

  const registerText =
    register === "SIE"
      ? 'The task requires the FORMAL register ("Sie"). Using "du" is a communicative-design error.'
      : 'The task requires the INFORMAL register ("du"). Using "Sie" is a communicative-design error.';

  // Not "no Betreff is required" - several papers do advise one. The point is that
  // it is not a Textsortenmerkmal here, so its absence must not cost marks.
  const subjectText = requiresSubject
    ? "The task asks for a subject line (Betreff). Note in your comment whether one is present and informative, as advice — but no criterion marks it, so its absence must not withhold a band on its own."
    : "A subject line (Betreff) is not a required feature of this Textsorte. Do not withhold marks if there is none, even if the task's own advice mentions one.";

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
${salutationText ? `- ${salutationText}\n` : ""}- Expected length: ${
    rubric.maxWords === null
      ? `at least ${rubric.minWords} words, with no upper limit — do not penalise length`
      : `${rubric.minWords}-${rubric.maxWords} words`
  }. The student wrote ${wordCount} words.

LEVEL-SPECIFIC GUIDANCE FOR YOU AS EXAMINER:
${rubric.guidance}

EVALUATION CRITERIA:
${contentPointText}${selfChosenText}${criteriaText}

STUDENT'S ESSAY (German, submitted as-is, do not alter before analysis):
"""
${essay}
"""

Work in this order:
1. Decide whether the text misses the topic entirely (themaVerfehlt). This is rare — only for a text that is not an answer to this task at all.${
    rubric.themaVerfehltZeroesTask
      ? ""
      : " Report it for the record; at this level it carries no automatic penalty, because an off-topic text already earns no content marks."
  }
2. Read the text sentence by sentence and list EVERY error as a correction (original -> corrected, each with a short explanation). Do this BEFORE you award any band, because the bands have to account for what you find here. Look in particular for the errors that change what the sentence says, which are easy to read past because the German around them is fluent:
   - a word that is grammatically fine but wrong in context, so the sentence states something absurd or unintended ("ein Abitur, mit dem geleistete Nachts verrechnet werden" for a points system; "Möbel für Gott aufgebaut"; "über eine ausführliche Schule würde ich mich freuen" for eine Auskunft);
   - a negation that inverts the intent — kein, keine, nicht, niemals — so the writer asks for the opposite of what the task requires ("bräuchte ich kein gelegentlich Hilfe"; "bereit, keine Pakete anzunehmen");
   - a statement that contradicts another one, or contradicts the Situierung ("beruflich niemals unterwegs" while asking for help because of work travel; mowing a lawn "im Winter");
   - a word from another language left in the German ("unterwegs and allein").
   Quote the original exactly as written. Do not silently repair the text as you read: judge what it actually says, not what it evidently meant.
3. ${
    promptStatuses
      ? `Go through the Leitpunkte one at a time, in the order listed above, and give each a status, applying this level's own wording exactly: ADDRESSED = "${promptStatuses.ADDRESSED}", PARTIAL = "${promptStatuses.PARTIAL}", MISSING = "${promptStatuses.MISSING}".`
      : "Go through the Leitpunkte one at a time, in the order listed above, and decide for each whether the essay treats it adequately (ADDRESSED), only touches it (PARTIAL), or omits it (MISSING)."
  } A point is not treated adequately merely because sentences point at it: if the errors from step 2 mean the text states the opposite of what the point asks, or names something the task did not ask about, it is at best PARTIAL. Return one entry per Leitpunkt, copying its text verbatim. Do not merge or reorder them.${
    selfChosen
      ? " Then, if the letter develops a further relevant aspect of its own that is not one of the printed Leitpunkte, append one more entry for it with selfChosen=true."
      : ""
  }
4. ${
    contentPoints
      ? "For each criterion listed above, pick the ONE band whose descriptor best fits and return it under that criterion's key. The content marks are NOT a criterion — they come from the statuses you assigned in step 3, so do not return a band for them."
      : // The band letters are the ones this rubric defines, not a hardcoded A/B/C/D:
        // spelling out "(A, B, C or D)" told a telc B2 examiner to pick from a set that
        // excludes A*, contradicting the very bands listed above it in the same prompt.
        // Both B1 and B2 band their first criterion on a count. B2's used to be described
        // here as "a holistic judgement, NOT a count", which came from a 2013 publisher's
        // Modelltest; telc's own 2019 grid bands it "Drei Leitpunkte bzw. zwei Leitpunkte
        // und ein weiterer…", and the rubric was corrected to say so. This step was not,
        // so the prompt told the model to count twice and then not to count — with the
        // contradiction in the last and most operational instruction it reads.
        `For each criterion, pick the ONE band (${bandLetters}) whose descriptor best fits, and return it under that criterion's key. For the Leitpunkte criterion, count how many points you marked ADDRESSED and choose the band that matches that count — PARTIAL does not count as adequately treated.${
          selfChosen ? " A self-chosen aspect counts the same as a printed Leitpunkt." : ""
        }`
  }
   Your bands must be consistent with the corrections you listed in step 2 — a band is a description of this text, and it cannot say the opposite of what you just found. Check each one against its own wording before you commit to it: a band offered only for errors "die das Verständnis nicht gefährden" is unavailable once you have listed errors that do; a band describing a broad or adequate Wortschatzspektrum is unavailable once you have listed words that make their sentences unintelligible; repeated errors of the same kind (gender, case, agreement) are systematic, not Ausrutscher. Where the text sits between two bands, the errors that block understanding decide it.
5. Write a brief overall prose feedback summary. Name the errors from step 2 that change the meaning, and say what the sentence ended up saying — that is the single most useful thing the learner can be told, and it is the thing they cannot see for themselves. Do not open with praise for fluency or structure if the text says things it did not mean to say; a reader who has to guess the intent has not understood it. Be encouraging about what genuinely worked, but never at the cost of leaving a meaning-changing error unmentioned.

Do NOT compute totals, percentages, or a final score — the points are derived from your bands automatically. Apply the standards of level ${level} only, neither a higher nor a lower level. Be specific. Respond only with the JSON described by the response schema.`;
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
    pct >= 90
      ? "sehr gut"
      : pct >= 80
        ? "gut"
        : pct >= 70
          ? "befriedigend"
          : pct >= 60
            ? "ausreichend"
            : "nicht ausreichend";
  return `${level} — ${total}/${maxTotal} (${descriptor})`;
}

/**
 * Whether a failed call was refused by Google's quota rather than answered badly.
 *
 * The two deserve opposite treatment. A call that reached the model costs the shared key
 * even when it fails, which is why failures are not normally refunded — but a call
 * refused at the gate never reached it and cost nothing, so the user's slot goes back.
 *
 * Matched on the status rather than with `instanceof ApiError`, since the SDK also wraps
 * transport-level failures, and a 429 is a 429 whichever layer raised it.
 */
/**
 * Whether the model was too busy to take the call — Google's 503 UNAVAILABLE, whose own
 * message says "Spikes in demand are usually temporary. Please try again later."
 *
 * Kept apart from `isQuotaError` because the two want opposite handling on the way out:
 * a 429 means slow down, so retrying it immediately makes things worse, while a 503 is
 * precisely the case where trying again shortly is the right move. They agree on one
 * thing — neither reached the model — which is why both refund.
 */
export function isOverloadedError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ((error as { status?: unknown }).status === 503) return true;
  const message = error instanceof Error ? error.message : "";
  return /UNAVAILABLE|\b503\b/.test(message);
}

/** Attempts to make of an overloaded call, including the first. */
const MAX_ATTEMPTS = 3;
/**
 * Waits between those attempts. Deliberately short: a user is holding a request open
 * behind this, so the whole retry budget adds at most ~4s to a submission that would
 * otherwise have failed outright.
 */
const RETRY_DELAYS_MS = [1000, 3000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `call`, trying again only while the model is too busy to take it.
 *
 * Separated from `evaluateEssay` so the policy is testable without a Gemini client: the
 * thing worth pinning down is which failures are retried and how many times, not the
 * request around them.
 */
export async function retryWhileOverloaded<T>(
  call: () => Promise<T>,
  { attempts = MAX_ATTEMPTS, delays = RETRY_DELAYS_MS, wait = sleep } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= attempts || !isOverloadedError(error)) throw error;
      await wait(delays[attempt - 1] ?? delays.at(-1) ?? 0);
    }
  }
}

export function isQuotaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ((error as { status?: unknown }).status === 429) {
    return true;
  }
  const message = error instanceof Error ? error.message : "";
  return /RESOURCE_EXHAUSTED|\b429\b|\bquota\b/i.test(message);
}

/**
 * Which quota a 429 was, and when Google says it clears.
 *
 * `isQuotaError` answers whether to refund; this answers what to tell the learner, and
 * the two are not the same question. Every 429 used to produce "please try again in a few
 * minutes", which is right for the per-minute quota and false for the per-day one — and
 * the free tier's daily allowance is small enough to be the one people actually meet.
 * Told to come back in minutes, they retry into a dead end for the rest of the day.
 *
 * Read from `error.message`, because that is where the SDK puts Google's raw JSON body,
 * and matched rather than parsed — same reason `isQuotaError` matches: the body is not
 * guaranteed to be the whole message, and a JSON.parse that throws would lose the one
 * signal we have.
 */
export type QuotaLimit = {
  /** "unknown" when Google named no quota we recognise — never a guess. */
  window: "day" | "minute" | "unknown";
  /**
   * Google's own RetryInfo, in seconds, where it gave one.
   *
   * Not a substitute for `window`, and not safe to put in a message on its own: a live
   * refusal of the *daily* quota came back advertising a 41-second delay. Building the
   * wording from this number would have swapped one false promise for a more precise
   * one. The quotaId is the trustworthy signal; this is only ever a refinement of it.
   */
  retryAfterSeconds: number | null;
};

export function describeQuotaLimit(error: unknown): QuotaLimit {
  const message = error instanceof Error ? error.message : "";

  /*
    A real refusal, captured from the free tier:

      "violations": [{ "quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                       "quotaValue": "20" }],
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "48s" }

    The quotaId carries the window in its name, which is the only part of this shape
    stable enough to match on: the metric path and the model name both move.
  */
  const window = /PerDay/i.test(message)
    ? "day"
    : /PerMinute/i.test(message)
      ? "minute"
      : "unknown";

  const retry = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(message);

  return {
    window,
    // Rounded up: a delay reported as 48.6s is not over until 49.
    retryAfterSeconds: retry ? Math.ceil(Number(retry[1])) : null,
  };
}

/**
 * What to tell a learner whose evaluation was refused upstream.
 *
 * Shared by both routes that call the model. They had drifted into two different
 * sentences for the same event, and the retry route additionally answered a quota refusal
 * with the overload wording, so the level that most needed "come back tomorrow" was the
 * one certain not to hear it.
 *
 * Every branch says the text is safe and that no evaluation was charged, because both are
 * true on every path here and the two facts are what make the message a reassurance
 * rather than a loss.
 */
export function upstreamFailureMessage(error: unknown): string {
  const saved = "Your text has been saved and this did not use up one of your evaluations";

  if (isQuotaError(error)) {
    const { window } = describeQuotaLimit(error);
    if (window === "day") {
      return `The shared daily evaluation limit has been reached. ${saved} — please try again tomorrow.`;
    }
    if (window === "minute") {
      return `Too many essays are being evaluated right now. ${saved} — please try again in a minute.`;
    }
    // No window named, so promise no time. "Later" is vague on purpose: the whole point
    // of this helper is that a confident wrong answer is worse than an unhelpful one.
    return `The evaluation service has hit a usage limit. ${saved} — please try again later.`;
  }

  return `The evaluation service is busy right now. ${saved} — please open the essay and retry in a minute.`;
}

export async function evaluateEssay(task: TaskContext): Promise<{
  result: EvaluationResult;
  verdict: ExaminerVerdict;
  raw: { model: string; text: string };
}> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const request = {
    model,
    contents: buildPrompt(task),
    config: {
      /*
        Marking is not a creative task, and the default sampling temperature made it an
        unreliable one. The same 175-word B2 letter — carrying four meaning-changing
        errors, among them "ein Abitur, mit dem geleistete Nachts verrechnet werden" —
        was marked 45/45 with an empty corrections list on one run and 33/45 with all
        four caught on the next, from a byte-identical prompt. A learner cannot use a
        grader that answers differently each time they press the button, and the failure
        mode is the dangerous direction: it tells them nothing is wrong.

        Greedy decoding does not make the model right, but it makes it consistent, so a
        wrong mark is now a reproducible bug that can be fixed here rather than a coin
        toss nobody can chase.
      */
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: buildResponseSchema(task.rubric),
    },
  };

  /*
    Retried only for an overloaded model. A single 503 used to lose the whole submission:
    the essay was saved, the call failed, and the learner was left with a text that could
    never be scored. Google calls that spike temporary and says to try again, so trying
    again is the fix.

    Deliberately narrow. A 429 is not retried — it means slow down, and hammering it is
    what turns a brief rate limit into a long one. Nor is a bad response: an empty body or
    unparseable JSON is a fault in the request or the schema, and repeating it identically
    would just pay for the same answer twice.
  */
  const response = await retryWhileOverloaded(() =>
    ai.models.generateContent(request),
  );

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const verdict = JSON.parse(text) as ExaminerVerdict;

  return {
    result: resultFromVerdict(verdict, task),
    verdict,
    raw: { model, text },
  };
}

/**
 * Derives the score and the breakdown from an examiner verdict. Split out from the
 * network call so it can be tested against malformed and surprising responses: a
 * model may omit a criterion, return a band the rubric does not define, or send
 * more coverage entries than the task has Leitpunkte, and none of that should
 * produce a nonsensical mark sheet.
 */
export function resultFromVerdict(
  verdict: ExaminerVerdict,
  task: Pick<TaskContext, "rubric" | "level" | "leitpunkte">,
): EvaluationResult {
  const { rubric, level } = task;
  // The task's own count, never the examiner's. A verdict that lists fewer points
  // than the task sets must lose those marks, not be scored out of a smaller total.
  const leitpunktCount = task.leitpunkte.length;

  const bands = Object.fromEntries(
    (verdict.criteriaVerdicts ?? []).map((v) => [v.key, v.band]),
  ) as Record<string, BandLetter>;

  const coverage = verdict.leitpunktCoverage ?? [];
  const breakdown = scoreFromBands({
    rubric,
    bands,
    themaVerfehlt: Boolean(verdict.themaVerfehlt),
    leitpunktCount,
    leitpunktStatuses: coverage.map((c) => c.status),
  });

  const criteriaScores: CriterionScore[] = rubric.criteria.map((criterion) => {
    // The same resolution the scorer uses, so the printed band and the points it is
    // shown beside can never come from different lookups. `at(-1)` remains the fallback
    // for a criterion the examiner omitted entirely, which scores 0 and so reads as the
    // bottom band — but it must not catch a letter this criterion simply spells
    // differently, which is what made an A* display as D.
    const band =
      resolveBand(criterion, bands[criterion.key]) ?? criterion.bands.at(-1)!;
    const comment =
      verdict.criteriaVerdicts?.find((v) => v.key === criterion.key)?.comment ??
      "";
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

  // Where content is marked per Inhaltspunkt there is no band to show, so the marks
  // are summed into one line that leads the breakdown, mirroring the "1-2-3-KG"
  // order of telc's own Antwortbogen. The per-point detail is the coverage list.
  const contentPoints = rubric.contentPointScoring;
  // Always shown now: the maximum comes from the task, so it cannot be zero even if
  // the examiner returned no coverage at all - that case is 0 out of the full total,
  // which is the honest reading, rather than a row quietly omitted.
  if (contentPoints) {
    const perPoint = contentPoints.points;
    const marks = contentPointMarks(
      contentPoints,
      coverage.map((c) => c.status),
      leitpunktCount,
    );
    // Only the marks that count: at telc A2 the task prints four Inhaltspunkte and
    // three are marked, so the one the candidate chose to skip is not described here
    // as unerfüllt - it simply falls outside the count.
    const countedStatuses = [...coverage.map((c) => c.status)]
      .sort((a, b) => (perPoint[b] ?? 0) - (perPoint[a] ?? 0))
      .slice(0, marks.counted);
    const fullyMet = countedStatuses.filter((s) => s === "ADDRESSED").length;
    criteriaScores.unshift({
      key: "inhaltspunkte",
      label: `${contentPoints.label} (${marks.counted} Inhaltspunkte)`,
      bandDescriptor: countedStatuses
        .map((s) => contentPoints.descriptors[s])
        .filter((d, i, all) => all.indexOf(d) === i)
        .join(" · "),
      score: breakdown.zeroedReason ? 0 : marks.earned,
      maxScore: marks.max,
      comment: `${fullyMet} von ${marks.counted} gewerteten Inhaltspunkten voll erfüllt.`,
    });
  }

  return {
    overallScore: breakdown.total,
    maxScore: breakdown.maxTotal,
    rawScore: breakdown.raw,
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
  };
}
