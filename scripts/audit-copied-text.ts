import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * Read-only. Reports whether any task still carries text transcribed from a paper.
 *
 *   DATABASE_URL="<url>" npm run audit:copied
 *
 * Writes nothing, so it is safe to point at production. It answers the only question
 * that matters after a seed-and-redact run: is a copied letter still reachable from
 * this database, whether through the picker or through an old essay page?
 *
 * The titles below are the ones that were replaced. A task carrying one of them is
 * expected to be retired AND to have no stimulus; an active one means the seed never
 * landed here.
 */

/** Replaced tasks, and the originals that should have taken their place. */
const REPLACED = [
  ["Ritas Hochzeit", "Sonjas Chorkonzert"],
  ["Ferienhaus im Schwarzwald", "Petras Bauernhaus im Schwarzwald"],
  ["Veras Weg zur Arbeit", "Veras neuer Arbeitsweg"],
  ["Thomas' Ausflug mit Bus und Schiff", "Thomas' Ausflug trotz Verletzung"],
  ["Janines Hochzeit im Oktober", "Janine heiratet im Oktober"],
  ["Maras Autoreise mit ihrem neuen Freund", "Maras Autoreise mit Simon"],
] as const;

/**
 * Phrases unique to the transcribed letters, including the papers' own printed typos
 * ("unserm", a lower-case "stelle" mid-sentence). Matching on these rather than on
 * titles catches a copied letter that was moved or re-titled by hand.
 */
const FINGERPRINTS = [
  "stelle dir vor, was mir mein Onkel",
  "unserm schönen",
  "Bei mir läuft alles prima",
  "Entschuldige, dass ich mich erst jetzt",
  "Warum hast Du in den letzten Wochen",
  "Hochzeitsreise",
];

/**
 * Which database this actually reached — host and database name, never the password.
 *
 * An audit that does not say what it audited is worth very little: this runs with
 * `--env-file=.env`, so a mistyped or unquoted inline DATABASE_URL silently falls back to
 * the local database and reports it as clean. Printing the target is what turns "clean"
 * into evidence about production rather than a result you have to take on trust.
 */
function describeTarget(url: string | undefined): string {
  if (!url) return "(DATABASE_URL is not set)";
  try {
    const u = new URL(url);
    const pooled = u.hostname.includes("-pooler") ? " [POOLED]" : "";
    return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}${pooled}`;
  } catch {
    return "(DATABASE_URL is not a parseable URL)";
  }
}

async function main() {
  let problems = 0;

  console.log(`Target: ${describeTarget(process.env.DATABASE_URL)}\n`);
  console.log("Replaced tasks\n");
  for (const [oldTitle, newTitle] of REPLACED) {
    const [oldRow, newRow] = await Promise.all([
      prisma.prompt.findFirst({
        where: { title: oldTitle },
        select: { isActive: true, stimulusText: true, _count: { select: { essays: true } } },
      }),
      prisma.prompt.findFirst({ where: { title: newTitle }, select: { isActive: true } }),
    ]);

    if (!oldRow) {
      console.log(`  ok      "${oldTitle}" — gone`);
    } else if (oldRow.isActive) {
      console.log(`  PROBLEM "${oldTitle}" — still ACTIVE and selectable`);
      problems++;
    } else if (oldRow.stimulusText !== null) {
      console.log(
        `  PROBLEM "${oldTitle}" — retired but still holds its letter ` +
          `(${oldRow._count.essays} essay(s) can see it)`,
      );
      problems++;
    } else {
      console.log(`  ok      "${oldTitle}" — retired, letter cleared`);
    }

    if (!newRow) {
      console.log(`  PROBLEM   replacement "${newTitle}" is MISSING — seed never landed`);
      problems++;
    } else if (!newRow.isActive) {
      console.log(`  PROBLEM   replacement "${newTitle}" exists but is not active`);
      problems++;
    }
  }

  console.log("\nFingerprint scan (all prompts, active or not)\n");
  for (const phrase of FINGERPRINTS) {
    const hits = await prisma.prompt.count({
      where: { stimulusText: { contains: phrase } },
    });
    if (hits > 0) {
      console.log(`  PROBLEM ${hits} prompt(s) still contain: "${phrase}"`);
      problems++;
    } else {
      console.log(`  ok      gone: "${phrase}"`);
    }
  }

  // Counted explicitly rather than with groupBy: groupBy omits a group with no rows, so
  // "retired=0" printed nothing at all and left the reader unable to tell "no retired
  // tasks" apart from "this line forgot to mention them".
  const [active, retired, retiredWithText] = await Promise.all([
    prisma.prompt.count({ where: { isActive: true } }),
    prisma.prompt.count({ where: { isActive: false } }),
    prisma.prompt.count({ where: { isActive: false, stimulusText: { not: null } } }),
  ]);
  console.log(`\nPrompt totals: active=${active}, retired=${retired}`);
  console.log(
    retired === 0
      ? "Nothing is retired here, so `npm run redact:retired` has nothing to do."
      : `${retiredWithText} of the ${retired} retired task(s) still hold a stimulus.`,
  );

  console.log(
    problems === 0
      ? "\nClean. No copied text is reachable from this database."
      : `\n${problems} problem(s) above. This database still serves copied text.`,
  );
  process.exitCode = problems === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
