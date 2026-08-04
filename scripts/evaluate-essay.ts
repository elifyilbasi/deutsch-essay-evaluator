import { readFileSync } from "node:fs";
import { getRubric } from "@/lib/rubrics";
import { buildPrompt, evaluateEssay, type TaskContext } from "@/lib/gemini";
import { countWords } from "@/lib/wordCount";
import type { Institute, Level } from "@/generated/prisma/client";

/**
 * Marks one essay from the command line, against the real rubric the app would use.
 *
 * Why this exists: a level can be fully implemented before it is switched on. telc B2 has
 * a rubric and an evaluator but no seeded prompts, so there is no way to reach it through
 * the write wizard — and waiting for a task bank to check whether the marking is right
 * gets the order backwards. This runs the same buildPrompt/evaluateEssay path the API
 * route runs, so what it prints is what a learner would get.
 *
 *   npm run evaluate -- --dry-run                  # print the prompt, call nothing
 *   npm run evaluate -- --essay my-brief.txt       # mark a file
 *   cat brief.txt | npm run evaluate               # or stdin
 *   npm run evaluate -- --level B1 --task task.json
 *
 * --dry-run costs nothing and is the way to inspect what the model is actually told.
 * Every other run is one real Gemini call against your key.
 */

type Args = {
  level: Level;
  institute: Institute;
  essayPath: string | null;
  taskPath: string | null;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    level: "B2",
    institute: "TELC",
    essayPath: null,
    taskPath: null,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${argv[i - 1]} needs a value`);
      return v;
    };
    switch (argv[i]) {
      case "--level":
        args.level = next() as Level;
        break;
      case "--institute":
        args.institute = next() as Institute;
        break;
      case "--essay":
        args.essayPath = next();
        break;
      case "--task":
        args.taskPath = next();
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  return args;
}

/** The task fields a --task JSON file may override. */
type TaskFile = Partial<
  Pick<
    TaskContext,
    | "promptTitle"
    | "taskIntro"
    | "stimulusText"
    | "stimulusAuthor"
    | "instructions"
    | "leitpunkte"
    | "register"
    | "requiresSubject"
  >
>;

/**
 * A stand-in task per level, so the script runs with no setup. Written in the exam's
 * format rather than copied from a paper — the same rule the seeded prompts follow,
 * since the published papers are copyrighted.
 */
const DEFAULT_TASKS: Record<string, Required<TaskFile>> = {
  B2: {
    promptTitle: "Beschwerde über einen Sprachkurs",
    taskIntro: "In einer Zeitschrift haben Sie folgende Anzeige gelesen:",
    stimulusText:
      "Sprachstudio Herzog — Intensivkurse Deutsch\nKleine Gruppen, erfahrene Lehrkräfte, moderne Räume.\nWir garantieren Ihnen schnellen Fortschritt in angenehmer Atmosphäre.\nSprachstudio Herzog, Marktstraße 8, 34117 Kassel",
    stimulusAuthor: null,
    instructions:
      "Sie haben den Intensivkurs besucht, waren aber nicht zufrieden. Schreiben Sie eine Beschwerde an das Sprachstudio Herzog. Behandeln Sie entweder a) mindestens drei der folgenden Punkte oder b) mindestens zwei der folgenden Punkte und einen weiteren Aspekt Ihrer Wahl. Vergessen Sie nicht Ihren Absender, die Anschrift, Datum, Betreffzeile, Anrede und Schlussformel. Schreiben Sie mindestens 150 Wörter.",
    leitpunkte: [
      "Warum Sie sich für diesen Kurs entschieden haben",
      "Womit Sie nicht zufrieden waren",
      "Was Ihnen an dem Kurs gefallen hat",
      "Was Sie jetzt von der Sprachschule erwarten",
    ],
    register: "SIE",
    requiresSubject: true,
  },
};

function readEssay(path: string | null): string {
  const raw = path ? readFileSync(path, "utf8") : readFileSync(0, "utf8");
  const essay = raw.trim();
  if (!essay) {
    throw new Error(
      "No essay text. Pass --essay <file>, or pipe the text in on stdin.",
    );
  }
  return essay;
}

function buildTask(args: Args): TaskContext {
  const rubric = getRubric(args.institute, args.level);
  if (!rubric) {
    throw new Error(
      `No rubric for ${args.institute} ${args.level}. Levels with one: see src/lib/rubrics/telc.ts.`,
    );
  }

  const fallback = DEFAULT_TASKS[args.level];
  const override: TaskFile = args.taskPath
    ? (JSON.parse(readFileSync(args.taskPath, "utf8")) as TaskFile)
    : {};
  if (!fallback && !args.taskPath) {
    throw new Error(
      `No built-in sample task for ${args.level}. Supply one with --task <file.json>.`,
    );
  }

  const essay = readEssay(args.essayPath);
  return {
    institute: args.institute,
    level: args.level,
    rubric,
    essay,
    wordCount: countWords(essay),
    ...fallback,
    ...override,
  } as TaskContext;
}

const bar = (label: string) => `\n${label}\n${"-".repeat(label.length)}`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const task = buildTask(args);

  if (args.dryRun) {
    console.log(buildPrompt(task));
    console.log(
      bar("DRY RUN") + "\nNothing was sent. Drop --dry-run to mark this essay for real.",
    );
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Run via `npm run evaluate`, which loads .env.",
    );
  }

  console.log(
    `Marking ${task.wordCount} words as ${task.institute} ${task.level} (min ${task.rubric.minWords}${
      task.rubric.maxWords === null ? ", no maximum" : `-${task.rubric.maxWords}`
    })...`,
  );
  const { result } = await evaluateEssay(task);

  console.log(bar("RESULT"));
  console.log(`${result.resultLabel}`);
  console.log(
    `Rohpunkte ${result.rawScore} x ${task.rubric.scoreMultiplier} = ${result.overallScore} / ${result.maxScore}`,
  );
  if (result.zeroedReason) console.log(`ZEROED: ${result.zeroedReason}`);

  console.log(bar("CRITERIA"));
  for (const c of result.criteriaScores) {
    console.log(`${c.band ?? "-"}  ${c.score}/${c.maxScore}  ${c.label}`);
    if (c.bandDescriptor) console.log(`    ${c.bandDescriptor}`);
    console.log(`    ${c.comment}`);
  }

  console.log(bar("LEITPUNKTE"));
  for (const l of result.leitpunktCoverage) {
    // The flag is the whole point of the B2 coverage rule: a self-chosen aspect is
    // coverage, not a gap, and it should be visible as such here too.
    const own = l.selfChosen ? "  [candidate's own aspect]" : "";
    console.log(`${l.status.padEnd(9)} ${l.leitpunkt}${own}`);
    console.log(`          ${l.comment}`);
  }

  console.log(bar(`CORRECTIONS (${result.corrections.length})`));
  for (const c of result.corrections.slice(0, 10)) {
    console.log(`- ${c.original}  ->  ${c.corrected}\n    ${c.explanation}`);
  }
  if (result.corrections.length > 10) {
    console.log(`  ... and ${result.corrections.length - 10} more`);
  }

  console.log(bar("FEEDBACK"));
  console.log(result.summaryFeedback);
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
