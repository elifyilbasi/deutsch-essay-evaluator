import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { telcA1Prompts } from "./seed-telc-a1";
import { telcB1Prompts } from "./seed-telc-b1";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Writing tasks in the authentic TELC "Schriftlicher Ausdruck" (Brief) format:
 * an intro line, an incoming letter to react to, and discrete Leitpunkte.
 *
 * The bulk of the B1 bank lives in ./seed-telc-b1.ts, transcribed from the practice
 * papers in exam-materials/telc/b1/. The entries below are the earlier hand-written
 * set: "Ritas Hochzeit" (also from a real paper) plus two originals that add a
 * formal-register (Sie) task, which the transcribed papers don't cover.
 */
const prompts: Array<{
  institute: "TELC";
  level: "A1" | "A2" | "B1";
  title: string;
  taskIntro: string;
  stimulusText: string | null;
  stimulusAuthor: string | null;
  instructions: string;
  leitpunkte: string[];
  register: "DU" | "SIE";
  requiresSubject: boolean;
  minWords: number;
  maxWords: number;
}> = [
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

  // ---------------- A2 ----------------
  {
    institute: "TELC",
    level: "A2",
    title: "Einladung zum Grillfest",
    taskIntro: "Eine Freundin hat Ihnen folgende Nachricht geschrieben:",
    stimulusAuthor: "Sabine",
    stimulusText: `Hallo ...,

am Samstag mache ich ein Grillfest in meinem Garten. Es kommen ungefähr zehn Leute, alle bringen etwas zu essen mit. Wir fangen um 16 Uhr an.

Hast du Zeit? Und kannst du vielleicht einen Salat mitbringen?

Liebe Grüße
Sabine`,
    instructions:
      "Antworten Sie Ihrer Freundin. Schreiben Sie etwas zu den folgenden vier Punkten. Überlegen Sie sich eine passende Reihenfolge, eine passende Anrede und einen passenden Schluss.",
    leitpunkte: [
      "Dank für die Einladung",
      "Ob Sie kommen können",
      "Was Sie mitbringen",
      "Eine Frage zum Fest",
    ],
    register: "DU",
    requiresSubject: false,
    minWords: 30,
    maxWords: 50,
  },
  {
    institute: "TELC",
    level: "A2",
    title: "Verabredung absagen",
    taskIntro: "Ein Freund hat Ihnen folgende Nachricht geschrieben:",
    stimulusAuthor: "Daniel",
    stimulusText: `Hi ...,

wir wollten doch morgen Abend ins Kino gehen. Der Film fängt um 20 Uhr an. Sollen wir uns vorher noch einen Kaffee trinken?

Bis morgen!
Daniel`,
    instructions:
      "Antworten Sie Ihrem Freund. Schreiben Sie etwas zu den folgenden vier Punkten. Überlegen Sie sich eine passende Reihenfolge, eine passende Anrede und einen passenden Schluss.",
    leitpunkte: [
      "Dass Sie leider absagen müssen",
      "Warum Sie nicht kommen können",
      "Eine Entschuldigung",
      "Ein neuer Terminvorschlag",
    ],
    register: "DU",
    requiresSubject: false,
    minWords: 30,
    maxWords: 50,
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

async function main() {
  // `sourceFile` is provenance for us, not a column - drop it before insert.
  const transcribed = [...telcA1Prompts, ...telcB1Prompts].map((entry) => {
    const { sourceFile, ...prompt } = entry;
    void sourceFile;
    return prompt;
  });
  const allPrompts = [...prompts, ...transcribed];

  let created = 0;
  for (const prompt of allPrompts) {
    const existing = await prisma.prompt.findFirst({
      where: { institute: prompt.institute, level: prompt.level, title: prompt.title },
    });
    if (existing) {
      continue;
    }
    await prisma.prompt.create({ data: prompt });
    created += 1;
  }
  console.log(
    `Seeded ${created} new prompts (${allPrompts.length - created} already existed, ${allPrompts.length} total).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
