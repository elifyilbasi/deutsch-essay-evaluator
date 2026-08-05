import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { SeedPrompt } from "./seed-types";
import { telcA1Prompts } from "./seed-telc-a1";
import { telcA2Prompts } from "./seed-telc-a2";
import { telcB1Prompts } from "./seed-telc-b1";
import { telcB2Prompts } from "./seed-telc-b2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/** A seed entry as it goes to the database: `sourceFile` is provenance, not a column. */
type SeededTask = Omit<SeedPrompt, "sourceFile">;

/**
 * Writing tasks in the authentic TELC "Schriftlicher Ausdruck" (Brief) format:
 * an intro line, an incoming letter to react to, and discrete Leitpunkte.
 *
 * The bulk of the B1 bank lives in ./seed-telc-b1.ts, transcribed from the practice
 * papers in exam-materials/telc/b1/. The entries below are the earlier hand-written
 * set: "Ritas Hochzeit" (also from a real paper) plus two originals that add a
 * formal-register (Sie) task, which the transcribed papers don't cover.
 *
 * A1 and A2 are transcribed papers throughout, in ./seed-telc-a1.ts and
 * ./seed-telc-a2.ts, so neither level appears below.
 */
const prompts: SeededTask[] = [
  // ---------------- B1 ----------------
  {
    institute: "TELC",
    level: "B1",
    title: "Ritas Hochzeit",
    taskIntro: "Eine Bekannte hat Ihnen folgenden Brief geschrieben:",
    stimulusAuthor: "Rita",
    stimulusText: `Liebe(r) ...,

endlich habe ich Zeit, dir wieder mal zu schreiben. Schade, dass du bei unserer Hochzeit nicht dabei sein konntest! Wir waren mit Freunden und Verwandten über 50 Personen. Ich habe ein langes, weißes Kleid getragen, und Karl hat sich für diesen Tag einen teuren, schwarzen Anzug gekauft, obwohl er sonst immer nur Jeans trägt. Natürlich gab es ein wunderbares Festessen und danach wurde getanzt. Karl und ich haben viele Geschenke bekommen, vor allem auch Geld für unsere Hochzeitsreise. Wir wissen aber noch gar nicht, wohin wir fahren wollen.

Wie läuft's eigentlich bei dir, du hast doch eine neue Stelle? Wie gefällt dir die Arbeit? Karl und ich würden uns sehr freuen, wenn du uns wieder mal besuchen würdest!

Liebe Grüße
Rita`,
    instructions:
      "Antworten Sie Ihrer Bekannten. Schreiben Sie etwas zu den folgenden vier Punkten. Überlegen Sie sich vor dem Schreiben eine passende Reihenfolge der Punkte, eine passende Anrede, Einleitung und einen passenden Schluss.",
    leitpunkte: [
      "Ihre neue Arbeitsstelle",
      "Wie man in Ihrem Land heiratet",
      "Vorschlag für Ritas Hochzeitsreise",
      "Rita und Karl besuchen?",
    ],
    register: "DU",
    requiresSubject: false,
    minWords: 80,
    maxWords: 100,
  },
  {
    institute: "TELC",
    level: "B1",
    title: "Umzug in eine andere Stadt",
    taskIntro: "Ein Freund hat Ihnen folgende E-Mail geschrieben:",
    stimulusAuthor: "Tobias",
    stimulusText: `Hallo ...,

stell dir vor, ich ziehe um! Meine Firma hat mir eine Stelle in München angeboten und ich habe zugesagt. Die Wohnung ist zwar kleiner als meine jetzige, aber sie liegt mitten in der Stadt und ich brauche nur zehn Minuten zur Arbeit.

Ehrlich gesagt bin ich auch ein bisschen nervös. Ich kenne dort fast niemanden und meine ganze Familie bleibt hier. Wie war das bei dir, als du umgezogen bist? Hast du Tipps für mich, wie man in einer neuen Stadt Leute kennenlernt?

Am 15. mache ich eine kleine Abschiedsparty. Kommst du?

Viele Grüße
Tobias`,
    instructions:
      "Antworten Sie Ihrem Freund. Schreiben Sie etwas zu den folgenden vier Punkten. Überlegen Sie sich vor dem Schreiben eine passende Reihenfolge der Punkte, eine passende Anrede, Einleitung und einen passenden Schluss.",
    leitpunkte: [
      "Ihre Reaktion auf die Nachricht",
      "Ihre eigenen Erfahrungen mit einem Umzug",
      "Tipps, wie man neue Leute kennenlernt",
      "Zusage oder Absage für die Abschiedsparty",
    ],
    register: "DU",
    requiresSubject: false,
    minWords: 80,
    maxWords: 100,
  },
  {
    institute: "TELC",
    level: "B1",
    title: "Beschwerde über einen Sprachkurs",
    taskIntro: "Sie haben folgende E-Mail von einer Sprachschule bekommen:",
    stimulusAuthor: "Frau Wagner",
    stimulusText: `Sehr geehrte Damen und Herren,

vielen Dank, dass Sie an unserem Abendkurs "Deutsch für den Beruf" teilgenommen haben. Wir möchten unser Angebot verbessern und bitten Sie deshalb um eine kurze Rückmeldung.

Waren Sie mit dem Unterricht zufrieden? Gab es Probleme? Und würden Sie im nächsten Semester wieder einen Kurs bei uns buchen?

Für Ihre Antwort bedanken wir uns im Voraus.

Mit freundlichen Grüßen
Ute Wagner
Sprachschule Lingua`,
    instructions:
      "Antworten Sie der Sprachschule. Schreiben Sie etwas zu den folgenden vier Punkten. Überlegen Sie sich vor dem Schreiben eine passende Reihenfolge der Punkte, einen passenden Betreff, eine passende Anrede, Einleitung und einen passenden Schluss.",
    leitpunkte: [
      "Grund Ihres Schreibens",
      "Was Ihnen am Kurs gut gefallen hat",
      "Welches Problem es gab",
      "Ob Sie wieder einen Kurs buchen möchten",
    ],
    register: "SIE",
    requiresSubject: true,
    minWords: 80,
    maxWords: 100,
  },

  // ---------------- A1 ----------------
  {
    institute: "TELC",
    level: "A1",
    title: "Nachricht an die Lehrerin",
    taskIntro: "Sie sind krank. Ihre Lehrerin hat Ihnen geschrieben:",
    stimulusAuthor: "Frau Berger",
    stimulusText: `Guten Tag,

Sie waren heute nicht im Deutschkurs. Ist alles in Ordnung?

Viele Grüße
Frau Berger`,
    instructions:
      "Antworten Sie Ihrer Lehrerin. Schreiben Sie etwas zu den folgenden drei Punkten. Vergessen Sie die Anrede und den Schluss nicht.",
    leitpunkte: [
      "Warum Sie nicht kommen konnten",
      "Wie lange Sie fehlen",
      "Eine Frage zur Hausaufgabe",
    ],
    register: "SIE",
    requiresSubject: false,
    minWords: 25,
    maxWords: 40,
  },
  {
    institute: "TELC",
    level: "A1",
    title: "Antwort an eine Freundin",
    taskIntro: "Eine Freundin hat Ihnen folgende Nachricht geschrieben:",
    stimulusAuthor: "Lena",
    stimulusText: `Hallo ...,

wie geht es dir? Was hast du am Wochenende gemacht?

Liebe Grüße
Lena`,
    instructions:
      "Antworten Sie Ihrer Freundin. Schreiben Sie etwas zu den folgenden drei Punkten. Vergessen Sie die Anrede und den Schluss nicht.",
    leitpunkte: [
      "Wie es Ihnen geht",
      "Was Sie am Wochenende gemacht haben",
      "Eine Frage an Lena",
    ],
    register: "DU",
    requiresSubject: false,
    minWords: 25,
    maxWords: 40,
  },
];

/**
 * The task fields a seed entry owns, and which re-seeding therefore rewrites.
 *
 * (institute, level, title) is the match key rather than a field, and `isActive` is
 * deliberately absent: it is an operational flag toggled in the database to retire a
 * task, and re-seeding must not switch a retired one back on.
 *
 * The seed used to `continue` past a row that already existed, which made it
 * insert-only: correcting a task in these files left the database on the old value
 * forever. That is not hypothetical — it had already stranded 13 B1 tasks on
 * `requiresSubject: true` after the flag was reasoned down to false, so the grader was
 * still being told to mark a Betreff that telc's own B1 criteria do not require.
 * Rewriting these fields is safe because the seed is the only writer of this table:
 * nothing in src/ creates, updates or deletes a Prompt.
 *
 * Safe, that is, only while nobody has sat the task. Every field here is part of the
 * brief the candidate wrote against, and an essay page renders the live Prompt row
 * beside a frozen Evaluation: src/app/essays/[id]/page.tsx shows this task's
 * instructions and Leitpunkte next to a leitpunktCoverage recorded against whatever
 * they said at the time. Rewriting a task that has essays would therefore reopen, on
 * the page that promises "the same brief the writer saw", the very disagreement this
 * propagation exists to close — and where the Leitpunkt count changes it turns
 * numeric, because maxRawScore() sizes the content maximum from leitpunkte.length
 * while each Evaluation keeps the maxScore it was scored out of. So a drifted task
 * that has been written against is reported and left alone; correcting it is a
 * judgement about existing results, not a thing to do silently at seed time.
 */
const SEEDED_FIELDS = [
  "taskIntro",
  "stimulusText",
  "stimulusAuthor",
  "instructions",
  "leitpunkte",
  "register",
  "requiresSubject",
  "minWords",
  "maxWords",
] as const satisfies ReadonlyArray<keyof SeededTask>;

type SeededField = (typeof SEEDED_FIELDS)[number];

/** Which seeded fields the stored row disagrees with. Arrays compare by value. */
function driftedFields(seed: SeededTask, row: Record<SeededField, unknown>): SeededField[] {
  return SEEDED_FIELDS.filter(
    (field) => JSON.stringify(seed[field]) !== JSON.stringify(row[field]),
  );
}

/**
 * Retire or remove stored tasks that these seed files no longer list.
 *
 * Without this the propagation only runs one way: dropping a task from the files
 * removes it from a fresh database but leaves every existing one still serving it.
 * Two stale A2 tasks reached the bank exactly that way.
 *
 * Scoped to the (institute, level) pairs the files actually populate — derived from the
 * entries themselves, never a hardcoded list, so adding a level's file brings it into
 * scope automatically. It now covers telc A1, A2, B1 and B2 and still says nothing about
 * Goethe — so a Prompt at a level with no seed entries is out of scope and never touched, and
 * "not in the seed files" only ever means "absent from a level the seed defines".
 * A level therefore cannot be emptied by an import going missing: with no entries it
 * is not a scope at all.
 *
 * Removal is destructive, so it splits on whether anything depends on the row:
 *  - no essays: deleted outright. Nothing references it and these files can recreate
 *    it, which is what makes them the source of truth.
 *  - essays: deactivated, never deleted. Essay.promptId has no cascade, so deleting
 *    would either fail or orphan a result; isActive: false takes it out of
 *    /api/prompts (which filters on it) while every past essay still resolves.
 *    This is the one place the seed writes isActive, and it does not contradict
 *    leaving that flag alone elsewhere: there the row is one the files still list and
 *    the flag is the operator's to set, here the files have withdrawn the task.
 */
async function prune(allPrompts: SeededTask[]) {
  type Scope = {
    institute: SeededTask["institute"];
    level: SeededTask["level"];
    titles: Set<string>;
  };
  const scopes = new Map<string, Scope>();
  for (const prompt of allPrompts) {
    const key = `${prompt.institute}|${prompt.level}`;
    let scope = scopes.get(key);
    if (!scope) {
      scope = { institute: prompt.institute, level: prompt.level, titles: new Set() };
      scopes.set(key, scope);
    }
    scope.titles.add(prompt.title);
  }

  let deleted = 0;
  let retired = 0;
  for (const { institute, level, titles } of scopes.values()) {
    const stored = await prisma.prompt.findMany({
      where: { institute, level },
      include: { _count: { select: { essays: true } } },
    });
    for (const row of stored) {
      if (titles.has(row.title)) {
        continue;
      }
      const essays = row._count.essays;
      if (essays === 0) {
        await prisma.prompt.delete({ where: { id: row.id } });
        deleted += 1;
        console.log(`  removed ${level} "${row.title}" (no essays)`);
        continue;
      }
      if (row.isActive) {
        await prisma.prompt.update({ where: { id: row.id }, data: { isActive: false } });
        retired += 1;
        console.log(
          `  retired ${level} "${row.title}" (${essays} essay${essays === 1 ? "" : "s"} kept)`,
        );
      }
    }
  }
  return { deleted, retired };
}

async function main() {
  // `sourceFile` is provenance for us, not a column - drop it before insert.
  const transcribed = [...telcA1Prompts, ...telcA2Prompts, ...telcB1Prompts, ...telcB2Prompts].map((entry) => {
    const { sourceFile, ...prompt } = entry;
    void sourceFile;
    return prompt;
  });
  const allPrompts: SeededTask[] = [...prompts, ...transcribed];

  let created = 0;
  let updated = 0;
  const withheld: string[] = [];
  const retiredButListed: string[] = [];
  for (const prompt of allPrompts) {
    const existing = await prisma.prompt.findFirst({
      where: { institute: prompt.institute, level: prompt.level, title: prompt.title },
      // The essay count decides whether this row may be rewritten, so read it with the
      // row rather than in a second query per task.
      include: { _count: { select: { essays: true } } },
    });
    if (!existing) {
      await prisma.prompt.create({ data: prompt });
      created += 1;
      continue;
    }

    // Reported, never corrected. prune() retires a withdrawn task by clearing this
    // flag, so putting the task back in the files would otherwise leave it invisible
    // for good — but flipping it back here would equally undo an operator who
    // retired a task by hand, and the seed cannot tell those two apart. Saying so is
    // the only move that does not silently overrule somebody.
    if (!existing.isActive) {
      retiredButListed.push(`${prompt.level} "${prompt.title}"`);
    }

    const drifted = driftedFields(prompt, existing);
    if (drifted.length === 0) {
      continue;
    }

    const essays = existing._count.essays;
    if (essays > 0) {
      withheld.push(
        `${prompt.level} "${prompt.title}" (${essays} essay${essays === 1 ? "" : "s"}): ` +
          drifted.join(", "),
      );
      continue;
    }

    // Update by id, so anything else pointing at this task keeps pointing at it.
    await prisma.prompt.update({
      where: { id: existing.id },
      data: Object.fromEntries(drifted.map((field) => [field, prompt[field]])),
    });
    updated += 1;
    console.log(`  updated ${prompt.level} "${prompt.title}": ${drifted.join(", ")}`);
  }

  // After the writes above, so that renaming a task creates the new row before the
  // old title is pruned, rather than briefly leaving the level short of it.
  const { deleted, retired } = await prune(allPrompts);

  const unchanged = allPrompts.length - created - updated - withheld.length;
  console.log(
    `Seeded ${created} new prompts, updated ${updated}, ` +
      `left ${unchanged} unchanged (${allPrompts.length} total). ` +
      `Pruned ${deleted} removed task(s), retired ${retired} that had essays.`,
  );
  if (withheld.length > 0) {
    console.warn(
      `\n${withheld.length} task(s) differ from these seed files but have essays written ` +
        `against them, so they were NOT rewritten:\n` +
        withheld.map((line) => `  ${line}`).join("\n") +
        `\n\nEach essay page shows the live task beside the evaluation it was graded ` +
        `under, so changing one of these rewrites the brief under a result that was ` +
        `scored on the old wording. Retire the task and re-seed it under a new title to ` +
        `keep both, or update it by hand if the existing results do not matter.`,
    );
  }
  if (retiredButListed.length > 0) {
    console.warn(
      `\n${retiredButListed.length} task(s) are listed in these seed files but are ` +
        `inactive in the database, so nobody is being offered them:\n` +
        retiredButListed.map((line) => `  ${line}`).join("\n") +
        `\n\nThe seed leaves isActive alone, so this is only ever undone by hand. ` +
        `Expected if you retired them deliberately; if instead they were withdrawn ` +
        `from the files and have since been restored, set isActive back to true.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
