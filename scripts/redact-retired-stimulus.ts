import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * Clears the stimulus letter from tasks that have been retired.
 *
 *   npm run redact:retired            # dry run, lists what it would clear
 *   npm run redact:retired -- --apply # writes
 *
 * Why this exists at all. Retiring a task does not blank it. `prisma/seed.ts` retires a
 * withdrawn task by clearing `isActive`, which takes it out of the picker but leaves the
 * row untouched — and `src/app/essays/[id]/page.tsx` renders `prompt.stimulusText`
 * whatever `isActive` says, so every past essay written against that task still displays
 * the old letter. When a task is retired *because* its text should no longer be served,
 * retiring alone does not achieve it; that was the case for the five B1 tasks whose
 * transcribed letters were replaced by originals.
 *
 * Why it is a separate step rather than part of the seed. The seed's withhold rule exists
 * to stop a brief being rewritten under a result that was scored against the old wording,
 * and clearing a stimulus is exactly the kind of destructive edit that rule is there to
 * prevent it doing by accident. Deciding that a particular letter must go is a judgement
 * about that letter, not something a re-seed should infer.
 *
 * What a learner sees afterwards: the page guards on `stimulusText &&`, so the letter
 * block disappears rather than rendering an empty frame. Their own essay, score, and
 * corrections are untouched — only the brief beside them loses its quoted letter. That is
 * a deliberate trade: showing nothing is honest, where showing a different letter than the
 * one they answered would not be.
 *
 * Only ever touches rows with `isActive: false`. An active task is one that is still being
 * set, and blanking its stimulus would break it for the next person who picks it.
 */

const apply = process.argv.includes("--apply");

async function main() {
  const retired = await prisma.prompt.findMany({
    where: { isActive: false, stimulusText: { not: null } },
    select: {
      id: true,
      institute: true,
      level: true,
      title: true,
      stimulusText: true,
      _count: { select: { essays: true } },
    },
    orderBy: [{ level: "asc" }, { title: "asc" }],
  });

  if (retired.length === 0) {
    console.log("No retired task still carries a stimulus. Nothing to do.");
    return;
  }

  console.log(
    `${retired.length} retired task(s) still carry a stimulus letter:\n`,
  );
  for (const p of retired) {
    // Deliberately not the first line: every one of these letters opens on the same
    // "Liebe(r) ........" placeholder, so that identifies nothing. The first line of real
    // prose is what lets you recognise which letter you are about to destroy — which is
    // the whole point of the dry run.
    const firstLine =
      p.stimulusText
        ?.split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 40)
        ?.slice(0, 72) ?? "(no prose line found)";
    const essays = p._count.essays;
    console.log(
      `  ${p.institute} ${p.level} "${p.title}" — ${essays} essay${essays === 1 ? "" : "s"} affected`,
    );
    console.log(`      ${firstLine}…`);
  }

  if (!apply) {
    console.log(
      "\nDry run. Nothing was written. Re-run with --apply to clear these stimulus texts.",
    );
    return;
  }

  const { count } = await prisma.prompt.updateMany({
    where: { id: { in: retired.map((p) => p.id) } },
    data: { stimulusText: null },
  });
  console.log(`\nCleared the stimulus on ${count} retired task(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
