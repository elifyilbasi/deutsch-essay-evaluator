/**
 * TELC B2 "Schriftlicher Ausdruck" tasks, modelled on the practice papers in
 * exam-materials/telc/b2/ (telc-uebungstest-01..33.png).
 *
 * UNLIKE the A1, A2 and B1 banks, the stimulus texts here are ORIGINAL. Those levels
 * quote a short personal letter; a B2 task reprints a full commercial advertisement —
 * company, address, contact details and ad copy — and 33 of those transcribed into a
 * database that gets deployed is precisely what exam-materials/README.md warns against.
 * So every firm, product, price and address below is invented. The format is the
 * papers': same Anzeige-then-Aufgabe shape, same register, same Leitpunkt style.
 *
 * `sourceFile` therefore records the paper each task's SHAPE follows, not a paper it was
 * copied from. Kept so the bank can be checked against the real spread of task types.
 *
 * The instruction apparatus is the papers' own, because it is identical boilerplate on
 * every one of them and is functional rather than creative: the entweder/oder rubric,
 * the reminder about Reihenfolge, Absender, Anschrift, Datum, Betreffzeile, Anrede and
 * Schlussformel, and "Schreiben Sie mindestens 150 Wörter."
 *
 * Every task here is B2, formal (Sie), four Leitpunkte, at least 150 words with no upper
 * limit, 30 minutes. `requiresSubject` is true throughout: unlike B1, whose Textsorte is
 * a persönliche oder halbformelle E-Mail with no Betreff required, every B2 paper asks
 * for a Betreffzeile outright, and Kriterium 1 marks "die Wahl von Textsorte und
 * Register" — so a missing one is a real deduction here.
 *
 * Titles are ours; the papers are all just headed "Schriftlicher Ausdruck".
 */
import type { SeedPrompt } from "./seed-types";

const base = {
  institute: "TELC",
  level: "B2",
  register: "SIE",
  requiresSubject: true,
  minWords: 150,
  // telc B2 prints a floor and no ceiling. See src/lib/rubrics/telc.ts.
  maxWords: null,
  // An advertisement has no correspondent to address the reply to by name.
  stimulusAuthor: null,
} as const;

/** The instruction block every B2 paper prints, around each task's own situation line. */
const aufgabe = (situation: string) =>
  `${situation}

Behandeln Sie entweder
a) mindestens drei der folgenden Punkte
oder
b) mindestens zwei der folgenden Punkte und einen weiteren Aspekt Ihrer Wahl.

Überlegen Sie sich vor dem Schreiben eine passende Reihenfolge der Punkte, eine passende Einleitung und einen passenden Schluss. Vergessen Sie nicht Ihren Absender, die Anschrift, Datum, Betreffzeile, Anrede und Schlussformel.

Schreiben Sie mindestens 150 Wörter.`;

export const telcB2Prompts: SeedPrompt[] = [
  {
    ...base,
    title: "Beschwerde über einen Sprachkurs",
    taskIntro: "In einer Zeitschrift haben Sie folgende Anzeige gelesen:",
    stimulusText: `Sprachstudio Herzog — Intensivkurse Deutsch

Kleine Gruppen von höchstens acht Teilnehmenden.
Erfahrene Lehrkräfte mit langjähriger Unterrichtspraxis.
Moderne, klimatisierte Räume mitten in der Innenstadt.

Wir garantieren Ihnen schnellen Fortschritt in angenehmer Atmosphäre.
Auf Wunsch stellen wir Ihnen eine Teilnahmebescheinigung für Ihren Arbeitgeber aus.

Sprachstudio Herzog
Marktstraße 8
34117 Kassel
kurse@sprachstudio-herzog.de`,
    instructions: aufgabe(
      "Sie haben einen Intensivkurs im Sprachstudio Herzog besucht, waren aber nicht zufrieden. Schreiben Sie eine Beschwerde an die Kursleitung.",
    ),
    leitpunkte: [
      "Berichten Sie, warum Sie sich für diesen Kurs entschieden haben.",
      "Erklären Sie ausführlich, womit Sie nicht zufrieden waren.",
      "Beschreiben Sie, was Ihnen an dem Kurs gefallen hat.",
      "Schreiben Sie, was Sie jetzt von der Sprachschule erwarten.",
    ],
    sourceFile: "telc-uebungstest-01.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Fahrschule",
    taskIntro: "In Ihrem Briefkasten fanden Sie folgende Werbung:",
    stimulusText: `Mit der Fahrschule Nordlicht kommen Sie schnell und preiswert ans Ziel!

Wir unterrichten in hellen, ruhigen Räumen und verfügen über neue Fahrzeuge.
Alle Klassen, alle Kurse — auch als Intensiv- oder Ferienkurs.

Unser Angebot umfasst:
• die Anmeldung bei der Behörde
• zwölf Sonderfahrten
• sechs Fahrstunden
• die Vorstellung zur theoretischen und zur praktischen Prüfung

Theorieunterricht auf Deutsch, Englisch und Türkisch.

Fahrschule Nordlicht
Inhaberin Petra Ohlsen
Amundsenstraße 44
24103 Kiel
www.fahrschule-nordlicht.de`,
    instructions: aufgabe(
      "Sie machen bei dieser Fahrschule Ihren Führerschein. Sie sind aber nicht zufrieden. Schreiben Sie eine Beschwerde an die Inhaberin.",
    ),
    leitpunkte: [
      "Berichten Sie, warum Sie sich für die Fahrschule Nordlicht entschieden haben.",
      "Erklären Sie, warum Sie unzufrieden sind.",
      "Beschreiben Sie Ihre Erfahrungen mit den Fahrlehrern.",
      "Beschreiben Sie Ihre Erfahrungen mit dem theoretischen Unterricht.",
    ],
    sourceFile: "telc-uebungstest-05.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Konzertreise",
    taskIntro: "In der Zeitung haben Sie folgende Anzeige gelesen:",
    stimulusText: `Konzerte erleben — von Rock bis Klassik

Reisen Sie mit anderen Musikbegeisterten zu einem Konzert Ihrer Wahl.
Wir organisieren die gesamte Reise, Sie genießen den Abend.

Unser Angebot:
• Fahrt mit modernen Reisebussen, Abfahrt in vielen deutschen Städten
• Unterbringung in Jugendherbergen oder Hotels
• auf Wunsch inklusive Abendessen
• Eintrittskarten zur gewünschten Veranstaltung

Während der gesamten Reise steht Ihnen eine Reiseleitung zur Verfügung.

Melodia Konzertreisen GmbH
Postfach 12 34 78
10130 Berlin
buchung@melodia-konzertreisen.de`,
    instructions: aufgabe(
      "Sie haben eine Konzertreise gemacht. Leider waren Sie nicht zufrieden. Schreiben Sie an den Veranstalter und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Erklären Sie, warum Sie das Angebot interessiert hat.",
      "Beschreiben Sie ausführlich, welche Probleme es gab.",
      "Schreiben Sie, was Ihnen an der Reise gefallen hat.",
      "Schildern Sie die Reaktion der Reiseleitung auf Ihre Beschwerde.",
    ],
    sourceFile: "telc-uebungstest-09.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Online-Bestellung",
    taskIntro: "Lesen Sie die folgende Werbeanzeige:",
    stimulusText: `Geschenke-Express Sonnentag

Sie suchen ein Geschenk für Verwandte, Freunde oder Kolleginnen?
Zum Geburtstag, zu einem Jubiläum oder einfach so?
Sie haben wenig Zeit, das passende Geschenk zu suchen?

Dann wählen Sie aus unserem umfangreichen Angebot — alles beste Qualität!
Wir versenden alles sorgfältig verpackt und auf Wunsch mit persönlicher
Glückwunschkarte. Natürlich pünktlich zum Wunschtermin.

Und das Beste: Der Versand ist kostenlos!

Geschenke-Express Sonnentag
Reiner-Sass-Weg 41
70912 Sindelfingen
bestellung@geschenke-sonnentag.de`,
    instructions: aufgabe(
      "Sie haben online ein Geburtstagsgeschenk bestellt. Leider hat nicht alles so funktioniert, wie Sie es erwartet hatten. Schreiben Sie an den Geschenke-Express und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Grund für Ihre Unzufriedenheit",
      "Wie und warum Sie auf das Angebot aufmerksam wurden",
      "Wie der Empfänger des Geschenks reagiert hat",
      "Was Sie jetzt von der Firma erwarten",
    ],
    sourceFile: "telc-uebungstest-17.png",
  },
  {
    ...base,
    title: "Beschwerde über ein Fitnessstudio",
    taskIntro: "In Ihrem Briefkasten fanden Sie folgende Werbung:",
    stimulusText: `AktivPunkt — Ihr Fitnessstudio im Grünen

Trainieren Sie sieben Tage die Woche von 6 bis 23 Uhr.
Über achtzig moderne Geräte auf zwei Etagen.
Kostenlose Einführung und persönlicher Trainingsplan für alle neuen Mitglieder.

Im Beitrag enthalten:
• alle Kurse (Rückenschule, Yoga, Schwimmen)
• Sauna- und Wellnessbereich
• Getränke während des Trainings
• Parkplätze direkt vor dem Haus

Die ersten zwei Monate zum halben Preis!

AktivPunkt Sport- und Gesundheitszentrum
Lindenallee 3
79100 Freiburg
service@aktivpunkt-freiburg.de`,
    instructions: aufgabe(
      "Sie sind seit einigen Monaten Mitglied im Fitnessstudio AktivPunkt. Mit mehreren Dingen sind Sie nicht zufrieden. Schreiben Sie eine Beschwerde an die Geschäftsleitung.",
    ),
    leitpunkte: [
      "Berichten Sie, warum Sie sich für dieses Studio entschieden haben.",
      "Beschreiben Sie ausführlich, womit Sie nicht zufrieden sind.",
      "Schildern Sie, wie das Personal auf Ihre Kritik reagiert hat.",
      "Schreiben Sie, welche Lösung Sie sich wünschen.",
    ],
    sourceFile: "telc-uebungstest-05.png",
  },
  {
    ...base,
    title: "Anfrage zu einem Haushaltsgerät",
    taskIntro: "In der Zeitung haben Sie folgende Anzeige gelesen:",
    stimulusText: `Moderne Technik macht es möglich:
Keine kostbare Zeit mehr für Hausarbeit verschwenden!

Unser Haushaltsroboter, der HausHelfer 400, erledigt alles automatisch für Sie.
Ob drinnen oder draußen — wer träumt nicht davon, nie mehr staubsaugen,
Böden oder Fenster putzen zu müssen!

Sie stellen den HausHelfer 400 einfach in einen Raum Ihrer Wohnung, auf den
Balkon oder Ihre Terrasse, drücken auf einen Knopf, und schon beginnt das Gerät
zu arbeiten. Vollautomatisch, sicher und zuverlässig.

Testen Sie den HausHelfer 400 unverbindlich. Sie werden begeistert sein!

Elektrohaus Bergmann
Kölnstraße 651
53117 Bonn
info@elektrohaus-bergmann.de`,
    instructions: aufgabe(
      "Sie interessieren sich für den HausHelfer 400 und haben noch einige Fragen. Schreiben Sie an die Firma Elektrohaus Bergmann und bitten Sie um mehr Informationen.",
    ),
    leitpunkte: [
      "für welche Arbeiten und für welche Räume Sie das Gerät brauchen",
      "technische Besonderheiten und Funktionen (z. B. Stromverbrauch, Lautstärke)",
      "Probebetrieb (Dauer, Kosten, Versand)",
      "mögliche Risiken (z. B. zerbrechliche Gegenstände, Treppen, Teppiche)",
    ],
    sourceFile: "telc-uebungstest-29.png",
  },
  {
    ...base,
    title: "Anfrage zu einem Ernährungskurs",
    taskIntro: "Sie finden in einer Zeitschrift folgende Anzeige:",
    stimulusText: `Wie ernähre ich mich richtig?

Überall hört und liest man von verschiedenen Ernährungstrends: vegetarisch,
vegan, Ernährung ohne Milchprodukte oder ohne Zucker — aber was ist wirklich
gut für Sie?

In unseren Kursen beantworten wir Ihre Fragen zum Thema Ernährung.
Außerdem erfahren Sie, woran Sie hochwertige Lebensmittel erkennen und wie Sie
sie am besten zubereiten. Auf Wunsch erhalten Sie individuelle Ernährungspläne.
Wir bieten auch Kochkurse für gesunde Ernährung an.

Alle Kursleiterinnen und Kursleiter sind seit vielen Jahren als
Ernährungsberater tätig.

Institut für bewusste Ernährung e. V.
Jahnstraße 120
70173 Stuttgart
info@ibe-stuttgart.de`,
    instructions: aufgabe(
      "Sie interessieren sich für das Angebot und haben noch einige Fragen. Schreiben Sie an das Institut für bewusste Ernährung und bitten Sie um mehr Informationen.",
    ),
    leitpunkte: [
      "Warum Sie sich für das Thema Ernährung interessieren.",
      "Beschreiben Sie genau, wie Sie sich zur Zeit ernähren.",
      "Schildern Sie Ihre Erfahrungen mit ähnlichen Kursen.",
      "Beschreiben Sie, welche Wünsche Sie an den Kurs haben.",
    ],
    sourceFile: "telc-uebungstest-33.png",
  },
  {
    ...base,
    title: "Anfrage zu einer Ferienwohnung",
    taskIntro: "Sie finden in einer Zeitschrift folgendes Angebot:",
    stimulusText: `Ferienhäuser Seeblick — Urlaub direkt am Wasser

Verbringen Sie Ihren Urlaub in einem unserer zwanzig Ferienhäuser an der
Mecklenburgischen Seenplatte. Ruhige Lage, eigener Garten, Seezugang in
wenigen Minuten zu Fuß.

Jedes Haus bietet:
• zwei bis vier Schlafzimmer
• voll ausgestattete Küche
• Terrasse mit Gartenmöbeln
• kostenloses WLAN

Fahrräder, Boote und Kanus können Sie bei uns vor Ort mieten.
Haustiere sind nach Absprache willkommen.

Ferienhäuser Seeblick
Am Anger 17
17192 Waren (Müritz)
buchung@ferienhaeuser-seeblick.de`,
    instructions: aufgabe(
      "Sie möchten mit Ihrer Familie dort Urlaub machen und haben noch einige Fragen. Schreiben Sie an die Ferienhäuser Seeblick und bitten Sie um mehr Informationen.",
    ),
    leitpunkte: [
      "Wann und mit wie vielen Personen Sie kommen möchten.",
      "Fragen Sie nach Preisen und möglichen Ermäßigungen.",
      "Erkundigen Sie sich nach der Ausstattung der Häuser.",
      "Fragen Sie nach Freizeitmöglichkeiten in der Umgebung.",
    ],
    sourceFile: "telc-uebungstest-33.png",
  },
  {
    ...base,
    title: "Bewerbung als Reiseleiter/in",
    taskIntro: "Sie finden in einer Zeitschrift folgendes Angebot:",
    stimulusText: `Reiseleiter/in gesucht!

Die Fernweh GmbH (Reise — Sprache — Kultur) sucht Reiseleiterinnen und
Reiseleiter für ausländische Deutschland-Besucher.

Sie lieben das Reisen und möchten Touristen und Reisegruppen aus Ländern, deren
Sprache Sie sprechen, mit Deutschland und der deutschen Kultur bekannt machen?
Dann sind Sie bei uns richtig.

Das sollten Sie mitbringen:
• gute Deutschkenntnisse
• gute Kenntnisse in Geographie und Geschichte Deutschlands
• mindestens zwölf Monate Aufenthalt in Deutschland
• Freude am Kontakt mit Menschen

Unsere Leistungen:
• Reisekosten, Unterkunft und Verpflegung sind frei
• Unfall- und Haftpflichtversicherung für die Dauer der Reise
• angemessene Honorierung auf freiberuflicher Basis

Fernweh GmbH
Postfach 200 100 33
10275 Berlin
bewerbung@fernweh-reisen.de`,
    instructions: aufgabe(
      "Schreiben Sie an die Fernweh GmbH und bewerben Sie sich.",
    ),
    leitpunkte: [
      "Ihre Qualifikation für diese Tätigkeit",
      "Ihre Erwartungen (Arbeitsumfang, Zeiten, Honorarvorstellungen)",
      "Ihre Sprachkenntnisse, Zertifikate, Niveau",
      "Bisherige Erfahrungen im Tourismusbereich",
    ],
    sourceFile: "telc-uebungstest-25.png",
  },
  {
    ...base,
    title: "Bewerbung um ein Freiwilliges Soziales Jahr",
    taskIntro: "In einer Zeitschrift haben Sie folgende Anzeige gelesen:",
    stimulusText: `Sie wollen sich im sozialen Bereich engagieren,
praktische Erfahrungen sammeln und sich persönlich weiterentwickeln?

Dann sind Sie bei uns richtig!

Der Verein Brückenschlag e. V. bietet Ihnen mit dem Freiwilligen Sozialen Jahr
viele Möglichkeiten, Erfahrungen im sozialen Bereich zu sammeln — in
Kindergärten, Pflegeeinrichtungen oder in der Arbeit mit Jugendlichen.

Wir bieten eine pädagogische Begleitung, ein monatliches Taschengeld und
Seminare zur beruflichen Orientierung. Das Freiwillige Soziale Jahr gibt Ihnen
Zeit, Ihre Berufswahl in Ruhe vorzubereiten.

Bewerbungen bitte an:
Verein Brückenschlag e. V.
Käthe-Kollwitz-Platz 3
10435 Berlin
fsj@brueckenschlag-verein.de`,
    instructions: aufgabe(
      "Sie möchten in Deutschland ein Freiwilliges Soziales Jahr machen. Bewerben Sie sich auf diese Anzeige.",
    ),
    leitpunkte: [
      "Erklären Sie, warum Sie sich für ein Freiwilliges Soziales Jahr interessieren.",
      "Beschreiben Sie Ihre bisherigen Erfahrungen im sozialen Bereich.",
      "Schreiben Sie, in welchem Bereich Sie arbeiten möchten und warum.",
      "Fragen Sie nach Unterkunft, Arbeitszeiten und Beginn.",
    ],
    sourceFile: "telc-uebungstest-25.png",
  },
  {
    ...base,
    title: "Beschwerde über einen Hotelaufenthalt",
    taskIntro: "Lesen Sie folgende Anzeige:",
    stimulusText: `City-Erlebnis für junge Leute
STADTHOTEL AKZENT

• All-inclusive-Aufenthalt: Buffet für Frühstück und Abendessen, Lunchpaket,
  alle Getränke im Preis inbegriffen
• Große, zweckmäßig eingerichtete Zimmer mit Bad, TV und WLAN
• Dachterrasse mit Schwimmbad und Panoramablick über die Stadt
• Fitnesscenter, Klettergarten, Disko mit Programm, Ausflüge

1 Woche ab € 189,-

Genießen Sie die Großstadt mit anderen jungen Leuten.

Stadthotel Akzent, Schwarzer Weg 15, 10115 Berlin
www.stadthotel-akzent.de`,
    instructions: aufgabe(
      "Sie haben die oben stehende Anzeige gelesen und eine Woche im Stadthotel Akzent verbracht. Sie waren mit Ihrem Aufenthalt sehr unzufrieden. Schreiben Sie an das Hotel und erläutern Sie, warum Sie unzufrieden sind und was Sie fordern.",
    ),
    leitpunkte: [
      "einige Unterschiede zur Werbung",
      "Entschädigung fordern",
      "Lage und Verkehrsanbindung",
      "Verbesserungsvorschläge",
    ],
    sourceFile: "telc-uebungstest-02.png",
  },
  {
    ...base,
    title: "Beschwerde über ein Online-Sprachpaket",
    taskIntro: "Sie lesen folgende Werbeanzeige:",
    stimulusText: `Deutsch? Aber sicher!
Deutsch online lernen — lernen Sie Deutsch von zu Hause aus!

Ein umfangreiches Online-Sprachpaket mit Zusatz-DVD und Arbeitsbuch hilft Ihnen,
besser Deutsch zu sprechen und zu schreiben.
Die 15 Lektionen sind locker und modern aufgebaut, mit vielen ansprechenden Fotos
und Videos. Bei vielen Übungen können Sprachtrainer online um Hilfe gebeten werden.

Sie erhalten:
• Online-Zugang
• DVD
• Arbeitsbuch

Preis: € 59,95

Verlag Neue Medien Gustavshafen
Hauptstraße 29
20765 Gustavshafen
www.neuemedien-gustavshafen.de`,
    instructions: aufgabe(
      "Sie haben den Online-Zugang bestellt und bezahlt. Leider sind Sie nicht zufrieden. Schreiben Sie an den Verlag und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Warum Sie sich für dieses Sprachpaket entschieden haben.",
      "Beschreiben Sie, warum Sie sehr unzufrieden sind.",
      "Machen Sie Vorschläge, wie das Sprachpaket verbessert werden sollte.",
      "Nennen Sie Ihre Forderungen an den Verlag.",
    ],
    sourceFile: "telc-uebungstest-03.png",
  },
  {
    ...base,
    title: "Beschwerde über einen Deutschkurs im Grünen",
    taskIntro: "In der Zeitung haben Sie folgende Anzeige gelesen:",
    stimulusText: `DEUTSCH LERNEN IN DER WALDSCHULE

Die Waldschule in der Nähe von Neustadt bietet einen anregenden Rahmen für einen
intensiven Deutschkurs. Sie liegt in einem größeren Waldgebiet circa drei Kilometer
außerhalb der Stadt.

Qualifizierte Deutschlehrerinnen und Deutschlehrer unterrichten Gruppen von
höchstens sechs Teilnehmenden, was einen raschen Lernfortschritt garantiert. Die
Kurse werden jeweils für mindestens zwei Wochen angeboten.

Die Unterrichtsräume sind mit modernster Technik ausgestattet. Jedem Teilnehmer
steht ein Computer mit Internetzugang zur Verfügung.
Untergebracht sind die Teilnehmenden in einem freundlichen Wohnheim direkt neben
der Schule.

Waldschule e. V.
Waldschulweg 3
55123 Neustadt
info@waldschule-neustadt.de`,
    instructions: aufgabe(
      "Sie haben an einem vierzehntägigen Deutschkurs in der Waldschule teilgenommen und waren nicht zufrieden. Schreiben Sie an die Waldschule.",
    ),
    leitpunkte: [
      "Erfahrungen mit anderen Sprachschulen",
      "Erwartungen nach dem Lesen der Anzeige",
      "Probleme mit der Unterkunft",
      "weshalb Sie mit dem Unterricht unzufrieden waren",
    ],
    sourceFile: "telc-uebungstest-04.png",
  },
  {
    ...base,
    title: "Beschwerde über ein Online-Fitnessprogramm",
    taskIntro: "Sie haben folgende Anzeige gelesen:",
    stimulusText: `Fitness-Online-Studio: Dein Traumkörper ist kein Traum mehr

Das Wetter ist schlecht, du hast wenig Zeit, aber du möchtest trotzdem etwas für
deinen Körper tun? Dann ist das Fitness-Online-Studio genau das Richtige für dich!

Du trainierst flexibel und individuell, wann und wo immer du möchtest.

Wir bieten dir Videos von examinierten Sportwissenschaftlern, die online abrufbar
sind. Professionelle Trainer präsentieren dir unsere Work-outs und legen dabei
großen Wert auf die korrekte Ausführung aller Übungen.

Viele Programme für Einsteiger und Fortgeschrittene: Entspannung, Yoga,
Intervalltraining, Ausdauertraining, Ganzkörper- und Krafttraining.

Trainiere eine Woche gratis und entscheide dich dann für eines unserer Angebote:
12 Monate 6,99 € · 6 Monate 9,99 € · 3 Monate 12,99 € pro Monat

www.fitness-online-studio.net`,
    instructions: aufgabe(
      "Sie haben sich vor zwei Monaten für eines der Trainingsangebote des Fitness-Online-Studios entschieden. Sie sind aber nicht zufrieden. Schreiben Sie eine Beschwerde an den Anbieter.",
    ),
    leitpunkte: [
      "Erklären Sie, warum Sie das Online-Angebot nutzen wollten und welche Ziele Sie hatten.",
      "Erläutern Sie, welches Angebot und welches Programm Sie in den letzten zwei Monaten genutzt haben.",
      "Beschreiben Sie detailliert, warum Sie unzufrieden sind.",
      "Erläutern Sie Ihre bisherigen Erfahrungen mit Sport.",
    ],
    sourceFile: "telc-uebungstest-06.png",
  },
  {
    ...base,
    title: "Beschwerde über einen Fotokurs",
    taskIntro: "Lesen Sie folgende Anzeige:",
    stimulusText: `Fotografieren für Fortgeschrittene!

Sie besitzen bereits Grundkenntnisse in der Fotografie, möchten aber Ihre Technik
verbessern. Der erfahrene Pressefotograf Robert Zahn steht Ihnen mit Rat und Tat
zur Seite. Er macht Sie mit den Feinheiten der Bildbearbeitung am Computer und der
Bildpräsentation bekannt und geht auf Ihre Fragen individuell ein.
Am Wochenende bieten wir Exkursionen unter fachlicher Leitung an.

Kurs 457638
Leitung: Robert Zahn, Pressefotograf
Mi. 18.00-20.15 Uhr, 7 Termine, 2 pro Monat
95 € / ermäßigt 75 €
Maximal 10 Teilnehmerinnen und Teilnehmer

Studio "Blende & Licht"
Nerostraße 13
63013 Frankfurt
studio@blende-und-licht.de`,
    instructions: aufgabe(
      "Sie haben an dem Fotokurs teilgenommen, waren aber sehr unzufrieden. Nichts war so, wie es in der Ankündigung beschrieben wurde, und auch die Termine wurden kurzfristig geändert. Schreiben Sie an das Studio und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Ihre konkreten Erwartungen an den Kurs",
      "Kritik an der Kursorganisation",
      "Kritik am Kursleiter",
      "Forderungen an das Studio",
    ],
    sourceFile: "telc-uebungstest-07.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Blumenlieferung",
    taskIntro:
      "Bei einem Stadtbummel haben Sie folgende Infobroschüre über ein Blumen-Online-Geschäft erhalten:",
    stimulusText: `BLUMENGRUSS-ONLINESHOP

Die Vorteile liegen klar auf der Hand:

Bei uns gibt es keine unnötigen Wege über Groß- und Einzelhandel. Alle unsere
Blumen und Pflanzen stammen direkt vom Gärtner und durchlaufen vor dem Versand
eine strenge Qualitätskontrolle.

Wir liefern nicht nur Blumen und Pflanzen für jeden Anlass und jeden Geldbeutel,
sondern auch individuelle, geschmackvolle Geschenksets für private und
geschäftliche Anlässe.

Wir liefern deutschlandweit mit Frische-Garantie, und Sie wählen, wann und wohin
die Lieferung gehen soll. Natürlich können Sie Ihre Bestellung auch mit
ansprechenden Grußkarten und Dekorationen ergänzen.

Gern sind wir von Montag bis Samstag für Sie erreichbar.

Servicetelefon: 040 - 2577 6655
service@blumengruss-onlineshop.de`,
    instructions: aufgabe(
      "Sie haben durch den Blumengruss-Onlineshop jemanden beliefern lassen. Sie sind nicht zufrieden. Schreiben Sie eine Beschwerde an den Onlineshop.",
    ),
    leitpunkte: [
      "Beschreiben Sie ausführlich, für welchen Anlass Sie welche Ware bestellt haben.",
      "Erklären Sie den Grund Ihrer Unzufriedenheit.",
      "Beschreiben Sie Ihre Erfahrungen mit der Service-Hotline.",
      "Machen Sie Vorschläge, wie der Onlineshop seine Leistungen verbessern kann.",
    ],
    sourceFile: "telc-uebungstest-08.png",
  },
  {
    ...base,
    title: "Beschwerde über Kosmetikprodukte",
    taskIntro: "Eine Freundin gab Ihnen folgende Einladung zu einer privaten Kosmetik-Party:",
    stimulusText: `NATURKLAR — Kosmetik-Party

Gönnen Sie sich und Ihrer Haut nur das Beste von Mutter Natur!
Wir bieten Ihnen exklusive Pflegekonzepte für Damen und Herren.

Unsere Pflegelinie NATURKLAR für Reinigung, Pflege und Schutz der Haut steht für
nachweislich wirksame Naturkosmetik, entwickelt aus sorgfältig ausgewählten
Rohstoffen. Wir pflegen einen schonenden Umgang mit natürlichen Ressourcen und
verwenden Pflanzenextrakte aus ökologischem Anbau. Unsere Produkte sind
vegetarisch und können auf Anfrage auch vegan hergestellt werden.

Überzeugen Sie sich von den hochwirksamen Inhaltsstoffen! Kommen Sie zu unserer
Kosmetik-Party und testen Sie unsere Produkte sofort oder zu Hause in aller Ruhe.

Wir bieten Ihnen neben nützlichen Tipps und einer umfassenden, hauttypgerechten
Beratung: Proben aller angebotenen Artikel, interessante Preise und attraktive
Rabattaktionen.

NATURKLAR Kosmetik
Telefon: 0800 - 12131415
info@naturklar-kosmetik.de`,
    instructions: aufgabe(
      "Sie haben auf der Kosmetik-Party zahlreiche Produkte gekauft, sind aber nicht zufrieden. Schreiben Sie eine Beschwerde an den Hersteller der Kosmetikprodukte.",
    ),
    leitpunkte: [
      "Beschreiben Sie, warum Sie an der Kosmetik-Party teilgenommen haben.",
      "Erklären Sie, welche Artikel Sie aus welchem Grund gekauft haben.",
      "Schreiben Sie, womit genau Sie unzufrieden sind.",
      "Erläutern Sie ausführlich, wie Sie die Beratung empfunden haben.",
    ],
    sourceFile: "telc-uebungstest-10.png",
  },
  {
    ...base,
    title: "Beschwerde über ein App-Portal",
    taskIntro: "Sie haben im Internet die folgende Anzeige gelesen und sich registriert:",
    stimulusText: `appfreude.net
Kostenlose Apps für dein Handy!

appfreude.net ist die Spaßseite für alle Smartphone-Benutzer:
jede Menge Apps für Spiele, Sport-Live-Sendungen und Filme.
Hol dir die aktuellsten Sportergebnisse, die neuesten Schlagzeilen,
die komischsten Witze oder wechsle schnell in dein Social Media.

Registriere dich jetzt und du hast sofort
unlimitierten Zugang* zu den Angeboten unserer Webseite.

appfreude GmbH
Sommerweg 34-36
37269 Eschwege
info@appfreude.net

* Dienste verfügbar gegen einen geringen Monatsbeitrag`,
    instructions: aufgabe(
      "Es gab jedoch Probleme. Schreiben Sie eine Beschwerde und nehmen Sie Bezug auf die Anzeige.",
    ),
    leitpunkte: [
      "Probleme bei der Nutzung",
      "welche Angebote Sie nutzen wollten",
      "Preis-Leistungs-Verhältnis",
      "Ihre Forderungen",
    ],
    sourceFile: "telc-uebungstest-11.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Pfeffermühle",
    taskIntro: "Sie haben folgende Werbung gelesen:",
    stimulusText: `KÜCHENFREUND
Würzen Sie Ihren Alltag mit Salz- und Pfeffermühlen von Küchenfreund.
Funktion und Design decken Ihren Tisch!

Modell "Würzfein"
Zwei hochwertige Salz- und Pfeffermühlen aus einer Materialkombination von Glas
und hochwertigem Kunststoff, mit Keramikmahlwerk. Das Herzstück jeder Mühle ist
das Keramikmahlwerk: härter als Stahl, verschleiß- und korrosionsfrei.

Praktisch in der Anwendung:
Mittels Einstellrad stufenlose Wahl der Mahlstärke von fein bis grob. Das Mahlwerk
sitzt oben und hinterlässt daher keine Mahlspuren auf dem Tisch.

Artikel-Nr.: 237.421.756
Höhe: 19 cm
Garantie: 10 Jahre auf das Keramikmahlwerk
Pflege: spülmaschinengeeignet

Küchenfreund GmbH — Filialen in mehr als 40 Städten
Hotline: 0511 / 22 44 66 (täglich 7-18 Uhr)
info@kuechenfreund.de`,
    instructions: aufgabe(
      "Sie haben dieses Produkt gekauft. Sie sind mit der Qualität nicht zufrieden. Schreiben Sie an den Hersteller und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Beschreiben Sie, wo und wann Sie dieses Produkt gekauft haben.",
      "Nennen Sie Gründe, warum Sie sich für dieses Produkt entschieden haben.",
      "Erklären Sie, warum Sie mit der Produktqualität nicht zufrieden sind.",
      "Beschreiben Sie Ihre Erfahrungen mit den Mitarbeitenden der Service-Hotline.",
    ],
    sourceFile: "telc-uebungstest-12.png",
  },
  {
    ...base,
    title: "Beschwerde über einen Tagesausflug",
    taskIntro: "Lesen Sie folgende Werbeanzeige:",
    stimulusText: `KULTUR UND KULINARIK
Fahren Sie mit uns von Berlin "ins Blaue"

Verbringen Sie einen Tag in angenehmer Gesellschaft. Genießen Sie die Fahrt und
schauen Sie sich die vorbeiziehende Landschaft in Ruhe an. Plaudern Sie mit den
anderen Fahrgästen und lassen Sie sich auf ganzer Linie verwöhnen!

Wir bieten Ihnen für nur 18,99 €

Frühstück:    Frühstücksbuffet — frisch und reichhaltig
Mittagessen:  regionale Spezialitäten — so viel Sie essen können
Kaffee:       Kuchen und Torten zur freien Auswahl

Lassen Sie sich von unserem Programm überraschen: Wir besichtigen unterwegs
Kirchen, Klöster, Burgen oder Schlösser und machen dabei natürlich entsprechende
Pausen. Doch wir erklären Ihnen nicht nur die Sehenswürdigkeiten, sondern bieten
Ihnen auch noch das eine oder andere Schnäppchen zum Kauf an!

Sonnenfahrt Reisen
Vulkanstraße 8
10315 Berlin
info@sonnenfahrt-reisen.de`,
    instructions: aufgabe(
      "Sie haben an dieser Fahrt teilgenommen und waren überhaupt nicht zufrieden. Nur der Reisebus hat Ihnen sehr gut gefallen. Schreiben Sie an den Reiseveranstalter und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Beschreiben Sie, warum Sie sich für den Tagesausflug entschieden haben.",
      "Erklären Sie, was Ihnen an dem Besichtigungsprogramm missfiel.",
      "Beschreiben Sie die Reaktionen der anderen Fahrgäste.",
      "Erläutern Sie, wie Sie die angebotenen Waren fanden.",
    ],
    sourceFile: "telc-uebungstest-13.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Radtour",
    taskIntro: "Sie lesen folgende Werbeanzeige:",
    stimulusText: `Mehr bewegen — aber wie?

Es ist in aller Munde: Wir bewegen uns zu wenig. Das schadet unserer Gesundheit!
Was können wir also tun?

Wir haben die Lösung! Jeden Abend und am Wochenende auch tagsüber bieten wir
"Radeln mit Spaß" an. Freundliche junge Trainerinnen und Trainer begleiten Sie bei
den Radtouren und gehen dabei gern auf Ihre Fragen rund um Sport und Gesundheit
ein. Ein großes Angebot an modernen Rädern steht bereit — falls Sie kein eigenes
Fahrrad haben.

Wir treffen uns jeden Abend ab 18 Uhr, am Samstag und Sonntag ab 10 Uhr, auf
unserem Vereinsgelände. Einstündige Touren mit Trainer kosten 5,00 €, oder Sie
werden gleich Mitglied für 25,00 € pro Monat.

Radfreunde Heimerstädt e. V.
Heidewiese 1
44777 Heimerstädt
info@radfreunde-heimerstaedt.de`,
    instructions: aufgabe(
      "Sie haben an einer Fahrradtour mit Trainer teilgenommen. Leider waren Sie nicht zufrieden. Schreiben Sie an den Verein und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Warum Sie das Angebot sehr interessant fanden.",
      "Beschreiben Sie detailliert die Probleme.",
      "Was Ihnen an der Fahrradtour gefallen hat.",
      "Beschreiben Sie genau die Reaktion des Trainers auf Ihre Fragen.",
    ],
    sourceFile: "telc-uebungstest-14.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Wohnungsbesichtigung",
    taskIntro: "Sie haben folgende Anzeige gelesen:",
    stimulusText: `In Offenbach zu Hause ...

Sie arbeiten in Frankfurt, können sich aber die hohen Mietpreise nicht leisten?
— Dann kommen Sie zu uns nach Offenbach!

Wir sind Ihr Ansprechpartner in Sachen preisgünstige Mietimmobilien. Besichtigen
Sie unsere erst kürzlich komplett sanierte Anlage Am Berg 22. Wir bieten Ihnen
attraktive 2-, 3- oder 4-Zimmer-Wohnungen mit Bad, Gäste-WC und Balkon oder
Gartenanteil.

Unsere Maklerinnen und Makler zeigen Ihnen exemplarisch einige der 150 verfügbaren
Etagenwohnungen und klären Sie dabei auf über
• Preise und Kosten
• Vertragsbedingungen
• Mietkaution
• Energieeffizienz
und stehen Ihnen für alle weiteren Fragen zur Verfügung.

Kommen Sie einfach ohne Anmeldung vorbei:
Besichtigung ab sofort jeden Sonntag von 10:00 bis 16:00 Uhr.

Wohnbaugesellschaft Offenbach Am Berg e. V.
Anlage Am Berg 22, 63071 Offenbach`,
    instructions: aufgabe(
      "Sie waren bei der Besichtigung der Wohnungen. Doch Sie waren mit dem Service nicht zufrieden. Schreiben Sie eine Beschwerde an die Wohnbaugesellschaft.",
    ),
    leitpunkte: [
      "Beschreiben Sie, warum Sie sich für die Wohnbaugesellschaft entschieden haben.",
      "Erklären Sie, was Ihnen bei einer Mietwohnung wichtig ist.",
      "Beschreiben Sie Ihre Erfahrungen bei der Besichtigung.",
      "Nennen Sie Ihre Forderungen an die Wohnbaugesellschaft.",
    ],
    sourceFile: "telc-uebungstest-15.png",
  },
  {
    ...base,
    title: "Beschwerde über den Service einer Wohnbaugesellschaft",
    taskIntro: "Sie haben folgende Anzeige gelesen:",
    stimulusText: `Sie arbeiten in Frankfurt, können sich aber die hohen Mietpreise nicht leisten?
— Dann kommen Sie zu uns nach Offenbach!

Besichtigen Sie unsere neu sanierte Anlage Am Berg 22. Wir bieten Ihnen attraktive
2-, 3- oder 4-Zimmer-Wohnungen mit Bad, Gäste-WC und Balkon oder Gartenanteil.

Unsere Maklerinnen und Makler zeigen Ihnen exemplarisch einige der 150 verfügbaren
Wohnungen und klären Sie dabei auf über Preise und Kosten, Vertragsbedingungen,
Mietkaution und Energieeffizienz und stehen Ihnen für alle weiteren Fragen zur
Verfügung.

Kommen Sie einfach ohne Anmeldung vorbei:
Besichtigung ab sofort jeden Sonntag von 10:00 bis 16:00 Uhr.

Wohnbaugesellschaft Offenbach Am Berg e. V.
Anlage Am Berg 22, 63071 Offenbach`,
    instructions: aufgabe(
      "Sie waren bei der Besichtigung der Wohnungen. Doch Sie waren nicht zufrieden. Schreiben Sie eine Beschwerde an die Wohnbaugesellschaft.",
    ),
    leitpunkte: [
      "Erläutern Sie, warum Sie sich für die Besichtigung entschieden haben.",
      "Erklären Sie, was Ihnen bei einer Mietwohnung wichtig ist.",
      "Beschreiben Sie Ihre Erfahrungen bei der Besichtigung.",
      "Machen Sie Vorschläge, wie die Wohnbaugesellschaft ihr Angebot verbessern könnte.",
    ],
    sourceFile: "telc-uebungstest-16.png",
  },
  {
    ...base,
    title: "Beschwerde über ein verunreinigtes Lebensmittel",
    taskIntro: "Sie haben Ihren Lieblingskäse gekauft. Auf der Verpackung steht der folgende Text:",
    stimulusText: `Schmelzkäse — Bergwiesen
Die Reinheit der Natur auf Ihrem Teller!

Schmelzkäse ist eine besondere Spezialität unter den Käsen und wird aus gereiftem
Schnittkäse oder Frischkäse auf Grundlage einer traditionellen Methode
weiterverarbeitet und gleichzeitig haltbar gemacht.

Schmelzkäse Bergwiesen ist in der modernen Küche besonders beliebt, da vielseitig
einsetzbar: Er bindet Soßen und Suppen, verleiht den Gerichten eine feinwürzige
Note, ist perfekt zum Überbacken geeignet und darf auf keinem Frühstücks- oder
Abendbrottisch fehlen.

Zutaten: 50 % Käse, Süßmolke, Butter, Schmelzsalze, Magermilch aus Kuhmilch,
Milcheiweiß, Speisesalz; Farbstoffe: Paprikaextrakt, Carotin.

10 Scheiben, einzeln in Folie verpackt.
Ungeöffnet mindestens 24 Tage haltbar. Nach dem Öffnen gekühlt lagern.
Artikelnummer: 9977 8855

Hersteller: Molkerei Bergwiesen
Lindauer Straße 5
87437 Kempten
info@molkerei-bergwiesen.de`,
    instructions: aufgabe(
      "Sie haben dieses Produkt gekauft, es war aber verunreinigt. Der Käse enthielt Fremdkörper. Sie sind nach dem Essen erkrankt. Schreiben Sie einen Brief an den Hersteller, in dem Sie sich beschweren.",
    ),
    leitpunkte: [
      "Erläutern Sie, wozu Sie diesen Käse verwenden.",
      "Beschreiben Sie, welche gesundheitlichen Beschwerden Sie nach dem Essen hatten.",
      "Erklären Sie, warum die Fremdkörper gesundheitsgefährdend sind.",
      "Beschreiben Sie, wen Sie außer dem Hersteller noch informiert haben.",
    ],
    sourceFile: "telc-uebungstest-18.png",
  },
  {
    ...base,
    title: "Beschwerde über einen Handytarif",
    taskIntro:
      "Sie haben einen neuen Vertrag für Ihr Smartphone aufgrund folgender Anzeige eines Anbieters abgeschlossen:",
    stimulusText: `Supergünstige Smartphone-Flatrate

Unbegrenztes Datenvolumen, SMS kostenfrei, Telefonieren innerhalb der
Landesgrenzen unbegrenzt — für sensationelle 8,99 € pro Monat!
Dazu bis zu 5 GB Daten Online-Speicher.
Unser Angebot umfasst außerdem optimalen Spam- und Virenschutz.

Unser kostenloser Kundendienst steht Ihnen telefonisch Montag bis Freitag von
08.00 bis 12.00 Uhr und von 14.00 bis 17.00 Uhr für sämtliche Probleme zur
Verfügung.

Bestellen Sie jetzt und profitieren Sie von unserem aktuellen Bonus von 15,00 €
für Neukunden!

Blitznetz GmbH
Bulgarische Str. 51-53
12435 Berlin
info@blitznetz.de`,
    instructions: aufgabe(
      "Es gab jedoch Probleme. Schreiben Sie dem Anbieter und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Ihre Erwartungen bei Vertragsabschluss",
      "warum Sie mit der Leistung nicht zufrieden sind",
      "Ihre Erfahrungen mit dem Kundendienst",
      "welche Forderungen Sie stellen",
    ],
    sourceFile: "telc-uebungstest-19.png",
  },
  {
    ...base,
    title: "Protest gegen den Abriss eines Spielplatzes",
    taskIntro:
      "In Ihrem Briefkasten finden Sie einen Brief, in dem es um den Spielplatz vor Ihrem Wohnhaus geht:",
    // The one B2 task whose stimulus really is a letter, not an advertisement — so the
    // reply is addressed back to its sender, and the prompt should say so.
    stimulusAuthor: "Wohnungsverwaltung Lindenhof GmbH",
    stimulusText: `Information

Liebe Anwohnerinnen und Anwohner,

der Spielplatz vor dem Haus muss entfernt werden. Er nimmt Platz weg und wird
deshalb abgerissen. An seine Stelle kommt ein Parkplatz, den alle Mieterinnen und
Mieter dringender benötigen als den Spielplatz. Nur 5 von 30 Familien, die hier
wohnen, haben Kinder, die den Spielplatz nutzen. Aber fast alle haben Autos und
brauchen Parkplätze.

Die Kinder können den Spielplatz in der Masch-Allee nutzen und müssen nicht
unbedingt vor dem Haus spielen. Parken aber müssen alle.

Am 30. des Monats beginnen die Arbeiten.

Ihre
Wohnungsverwaltung Lindenhof GmbH
Berliner Str. 25, 37073 Göttingen`,
    instructions: aufgabe(
      "Sie sind nicht mit dem Plan einverstanden. Schreiben Sie einen Beschwerdebrief an die Wohnungsverwaltung.",
    ),
    leitpunkte: [
      "Erklären Sie, warum Sie den Brief schreiben.",
      "Schreiben Sie, was Sie tun werden, um das Projekt zu stoppen.",
      "Erklären Sie, warum der Spielplatz wichtig ist.",
      "Erläutern Sie, welche Bauprojekte Sie für sinnvoller halten würden.",
    ],
    sourceFile: "telc-uebungstest-20.png",
  },
  {
    ...base,
    title: "Beschwerde über eine Sprachreise",
    taskIntro: "Lesen Sie folgende Anzeige:",
    stimulusText: `In einem fremden Land und doch zuhause!
Sprachlernen in der Familie

Wir haben für Sie Gastfamilien ausgesucht, in denen mindestens eine Person Lehrerin
oder Kursleiter ist. Sie leben in einer Familie, lernen unter qualifizierter
Anleitung die Sprache und können sofort üben. Auch für die Freizeitgestaltung ist
gesorgt. Teilen Sie uns einfach Ihre Interessen mit!

Aufenthalte sind zwischen zwei und acht Wochen möglich,
für jedes Niveau (Anfänger bis Fortgeschrittene).

Sondertarif: Exklusiv als Leserin oder Leser dieser Anzeige erhalten Sie 20 % Rabatt!

Buchen Sie noch heute:
Sprachbrücke Reisen GmbH
Große Falkenberger Allee 109
10612 Berlin
www.sprachbruecke-reisen.de`,
    instructions: aufgabe(
      "Sie hatten einen Aufenthalt von vier Wochen in Deutschland gebucht. Sie sind mit der Leistung sehr unzufrieden, weil nichts so war, wie es in der Anzeige versprochen wurde. Schreiben Sie an die Firma und beschweren Sie sich über die Leistung.",
    ),
    leitpunkte: [
      "Erwartungen beim Lesen der Anzeige",
      "Probleme während Ihres Aufenthalts",
      "Forderungen an die Firma",
      "wie Ihr Aufenthalt war",
    ],
    sourceFile: "telc-uebungstest-21.png",
  },
  {
    ...base,
    title: "Beschwerde über einen Internetanschluss",
    taskIntro:
      "Sie haben bereits ein Smartphone, sind aber mit Ihrem Anbieter unzufrieden. Sie lesen folgende Anzeige:",
    stimulusText: `Supergünstiger Vertrag für Ihr Smartphone
für nur € 9,98 im Monat

Mit einer monatlichen Zuzahlung von nur € 4,98 erhalten Sie ein unbegrenztes
Datenvolumen und können somit unbegrenzt im Internet surfen und telefonieren.

Gleich heute anmelden!
Sofort richten wir Ihren Vertrag ein, damit Sie sofort telefonieren und surfen
können.

Nordfunk Telekommunikation GmbH
Parkstr. 15
25541 Brunsbüttel
anmeldung@nordfunk-telekom.de
Telefon: 0185-333222 (€ 0,99 pro Minute)`,
    instructions: aufgabe(
      "Sie hatten sich aufgrund der Werbeanzeige für das Angebot entschieden. Doch auch nach zwei Monaten können Sie immer noch nicht über das Internet telefonieren. Sie haben schon bezahlt und fühlen sich jetzt betrogen. Schreiben Sie an die Telefongesellschaft und beschweren Sie sich.",
    ),
    leitpunkte: [
      "Beschreiben Sie, welche Erwartungen Sie nach dem Lesen der Anzeige hatten.",
      "Beschreiben Sie, welche Probleme Sie haben.",
      "Schildern Sie Ihre finanziellen und sonstigen Nachteile.",
      "Nennen Sie die Konsequenzen, die Sie andernfalls ziehen werden.",
    ],
    sourceFile: "telc-uebungstest-22.png",
  },
  {
    ...base,
    title: "Bewerbung um ein Praktikum im Umweltzentrum",
    taskIntro: "Sie suchen eine Praktikantenstelle. Sie finden folgendes Angebot im Internet:",
    stimulusText: `Nordbahn AG

Praktikantinnen und Praktikanten für das Bahn-Umwelt-Zentrum gesucht

Das Bahn-Umwelt-Zentrum bereitet für die Nordbahn AG die umweltpolitischen
Entscheidungen auf nationaler und europäischer Ebene vor.

Für unseren Standort Berlin suchen wir regelmäßig Praktikantinnen und Praktikanten.

Anforderungen:
• Ausdauer, Teamfähigkeit, Neugierde und Verantwortungsbewusstsein
• Erfahrungen mit umwelt- und verkehrspolitischen Fragestellungen von Vorteil
• Fremdsprachenkenntnisse

Nordbahn AG — Bahn-Umwelt-Zentrum
Caroline-Michaelis-Str. 5-11
10115 Berlin
Ansprechpartnerin: Caroline Groot
praktikum@nordbahn-umwelt.de`,
    instructions: aufgabe("Schreiben Sie an die Nordbahn AG. Bewerben Sie sich."),
    leitpunkte: [
      "Anforderungen in der Anzeige",
      "Ihr Interesse an Umweltfragen",
      "Fragen zu den Rahmenbedingungen",
      "Grund für die Bewerbung als Praktikantin bzw. Praktikant",
    ],
    sourceFile: "telc-uebungstest-23.png",
  },
  {
    ...base,
    title: "Bewerbung um eine Teilzeitstelle im Fitnesscenter",
    taskIntro: "In einer Zeitschrift haben Sie folgende Anzeige gelesen:",
    stimulusText: `Jobangebot im Fitnesscenter

Sie suchen eine Teilzeitstelle neben Studium, Ausbildung oder Beruf?

Unser Fitness-Club "AktivWerk — Ihre Spezialisten für Fitness und Ernährung" sucht
zur Unterstützung unseres Teams für 10-15 Std./Woche (Mo.-Sa.) engagierte
Mitarbeiterinnen und Mitarbeiter für die Betreuung und Beratung unserer Mitglieder.

Folgende Kompetenzen sollten Sie mitbringen:
• Erfahrung im Sport- und Gesundheitsbereich
• Spaß im Umgang mit Menschen
• Bereitschaft, Neues zu lernen
• gute Deutschkenntnisse (mündlich)

Unsere Pluspunkte:
• abwechslungsreiche Arbeit
• flexible Arbeitszeitgestaltung
• Möglichkeit zur Weiterbildung im Gesundheits- und Sportbereich (Trainerausbildung)

Wir freuen uns auf Ihre Bewerbung. Gern können Sie auch einen Probetag vereinbaren.

AktivWerk
Otto-Bayer-Straße 19
73730 Esslingen
bewerbung@aktivwerk-esslingen.de`,
    instructions: aufgabe('Schreiben Sie eine Bewerbung an "AktivWerk".'),
    leitpunkte: [
      "Warum sind Sie für diese Tätigkeit gut geeignet?",
      "Fragen zur Tätigkeit einer Fitness-Trainerin bzw. eines Fitness-Trainers",
      "Weiterbildungswünsche im Sport- und Gesundheitsbereich",
      "Erfahrungen mit Sportverletzungen oder Sportunfällen",
    ],
    sourceFile: "telc-uebungstest-24.png",
  },
  {
    ...base,
    title: "Anfrage zu einem Intensivkurs",
    taskIntro:
      "Sie möchten Ihr Deutsch weiter verbessern und einen dreiwöchigen Intensivkurs in Deutschland besuchen. Folgendes Angebot haben Sie in einer Zeitung gelesen:",
    stimulusText: `Deutsch in Dresden
Lernen Sie Deutsch an einem der schönsten Plätze Deutschlands!

Wir bieten:
• ein top ausgebildetes und engagiertes junges Lehrteam
• halbtägige oder ganztägige Intensivkurse, 5 Tage in der Woche
• Kleingruppen mit 4-6 Teilnehmenden
• alle Stufen von A1 bis C2
• Unterbringung nach Ihrer Wahl in Familie, Appartement oder Hotel, mit Frühstück
  oder Halbpension (im Appartement nur Selbstverpflegung)
• Freizeitangebot
• Preise ab 900,- € pro Woche bei Halbtagsintensivkurs (25 UE) und
  Familienunterkunft

Informationen und Anmeldung bei:
Wort und Satz — Institut für Sprachkurse
Prager Str. 278
01069 Dresden
info@wortundsatz-dresden.de`,
    instructions: aufgabe(
      "Schreiben Sie einen Brief an das Institut, um genauere Informationen zu erhalten.",
    ),
    leitpunkte: [
      "Beschreiben Sie, welche Unterbringung und Verpflegung Sie wünschen; fragen Sie auch nach dem Preis dafür.",
      "Beschreiben Sie Ihre Freizeitinteressen.",
      "Beschreiben Sie, welche Erfahrungen Sie bisher mit dem Lernen von Sprachen gemacht haben.",
      "Beschreiben Sie, was für einen Kurs Sie machen möchten und wann genau.",
    ],
    sourceFile: "telc-uebungstest-26.png",
  },
  {
    ...base,
    title: "Mithilfe bei einem Kulturfestival anbieten",
    taskIntro: "Lesen Sie folgende Werbeanzeige:",
    stimulusText: `Ehrenamtliche Helferinnen und Helfer gesucht!
Festival der Kulturen in Köln

Der Club der Kulturen veranstaltet dieses Jahr vom 5. bis 8. Oktober im Rheinpark
ein Festival der Kulturen.

Wir brauchen noch Verstärkung für das Rahmenprogramm, z. B.:
• Musikerinnen, Bands, Tanzgruppen, Akrobaten, Zauberer u. v. m.
• Helferinnen und Helfer für das Sportprogramm

Auch die Organisatoren brauchen noch Unterstützung:
• Helferinnen und Helfer an Bahnhof und Flughafen
• Verkauf und Bedienung an Essens- und Getränkeständen

Es wäre optimal, wenn ihr neben Deutsch noch andere Sprachen könnt.
Außerdem solltet ihr mindestens 18 Jahre alt sein.
Die Teilnahme am Festival ist kostenfrei.

Bitte schreibt uns, wenn ihr mithelfen möchtet. Bezahlen können wir euch aber
leider nicht. Wir hoffen auf euer Engagement.

Club der Kulturen
Postfach 14728
50346 Köln
festival@club-der-kulturen.net`,
    instructions: aufgabe(
      "Sie haben die oben stehende Anzeige gelesen und möchten bei dem Festival in Köln helfen. Schreiben Sie an den Club der Kulturen. Äußern Sie Ihr Interesse und bieten Sie Ihre Mithilfe an. Gehen Sie auf die Anzeige ein.",
    ),
    leitpunkte: [
      "Ihr Mithilfeangebot",
      "Erfahrungen mit ähnlichen Veranstaltungen",
      "warum Sie Interesse am Festival haben",
      "Dauer und Zeit Ihrer Mithilfe",
    ],
    sourceFile: "telc-uebungstest-27.png",
  },
  {
    ...base,
    title: "Anfrage zu einer Kochgruppe",
    taskIntro: "Sie finden in einer Zeitschrift folgende Anzeige:",
    stimulusText: `Günstig kochen für Alleinerziehende

Gesund und lecker zu kochen wird immer teurer. Alleinerziehende können sich oftmals
das Fleisch oder das Gemüse bzw. das Obst zum Mittag- oder Abendessen nicht leisten.
Das kann sich jetzt ändern!

Wir organisieren Gruppen für Mütter und Väter, die sich einmal am Tag bei einem der
Gruppenmitglieder treffen und dort zusammen kochen und essen. So lassen sich die
Kosten teilen! Es gibt nicht mehr als vier Alleinerziehende pro Gruppe. Ein weiterer
Vorteil: Beim Treffen können die Kinder miteinander spielen. Jedes Gruppenmitglied
ist immer nur für einen Teil des Essens verantwortlich, d. h. entweder das Gemüse,
die Nudeln oder das Fleisch bzw. den Nachtisch. Beim Einkauf achten alle auf lokale
Produkte. Am Sonntag wird gemeinsam ein Menüplan für die kommende Woche erstellt.

Meldet euch jetzt an bei:
Gemeinsam kochen e. V.
Hasengasse 12
60313 Frankfurt
www.gemeinsam-kochen-frankfurt.de`,
    instructions: aufgabe(
      "Sie interessieren sich für diese Idee und haben noch Fragen. Schreiben Sie an den Verein und bitten Sie um mehr Informationen.",
    ),
    leitpunkte: [
      "Warum Sie sich für das Thema günstiges Kochen interessieren.",
      "Beschreiben Sie genau, was und wie Sie kochen.",
      "Fragen Sie, was genau Sie über den Verein wissen möchten.",
      "Beschreiben Sie die Gruppe, mit der Sie gern gemeinsam kochen möchten.",
    ],
    sourceFile: "telc-uebungstest-28.png",
  },
  {
    ...base,
    title: "Anfrage zu einem Museumsbesuch",
    taskIntro: "Sie lesen folgende Werbung:",
    stimulusText: `MUSEUM FÜR ALLE
Natur für uns alle — interkultureller Austausch im NORDLICHT

Das gemeinnützige Angebot richtet sich an Jugendliche und Erwachsene aus Deutsch-
und Integrationskursen. Ziel ist die Förderung des interkulturellen Austauschs.

Sie können unser neu errichtetes Museum kostenlos besuchen und unter Anleitung von
Museumsmitarbeiterinnen entdecken. So stellen Sie mit den Schauobjekten des Museums
ganz leicht Bezüge zur eigenen Alltagswelt her und bauen Berührungsängste ab. Die
Exponate sind global ausgerichtet, damit rücken kulturelle Unterschiede in den
Hintergrund und Gemeinsamkeiten können leichter erkannt werden.

In gemütlicher Atmosphäre lässt sich bei uns die Vielfalt der Natur erkunden. Auf
einer Fläche von 6.000 qm erwarten Sie über 10.500 faszinierende Objekte aus allen
Teilen der Welt.

Naturkundemuseum NORDLICHT
Parkallee 34-38
28209 Bremen
info@naturmuseum-nordlicht.de`,
    instructions: aufgabe(
      "Sie sollen einen Museumsbesuch im Naturmuseum für Ihre Sprachkursgruppe organisieren. Schreiben Sie an das Naturmuseum und bitten Sie um mehr Informationen.",
    ),
    leitpunkte: [
      "Beschreiben Sie Ihre Erfahrungen mit Museen in Ihrer Heimat.",
      "Beschreiben Sie die Gruppe und Ihre Exkursionsplanung.",
      "Fragen Sie nach den Leistungen des Museums.",
      "Beschreiben Sie, was die Gruppe von der Museumsführung erwartet.",
    ],
    sourceFile: "telc-uebungstest-30.png",
  },
  {
    ...base,
    title: "Anfrage an ein Tierheim",
    taskIntro: "In der Zeitung haben Sie folgende Anzeige gelesen:",
    stimulusText: `TIERE SUCHEN EIN LIEBEVOLLES ZUHAUSE
TIERHEIM SONNENAU E. V.

Seit über 30 Jahren kümmern wir uns um den Tierschutz.

Sie sind tierlieb, wollen sich engagieren und uns nicht nur mit Spenden unterstützen?
Dann werden Sie aktiv, kommen Sie vorbei, helfen Sie ehrenamtlich bei den
alltäglichen Arbeiten, gehen Sie mit unseren Tieren "Gassi".

Geben Sie einem Kleintier (Hund, Katze, Kaninchen, Hamster, Vogel o. Ä.) ein neues
Heim. Suchen Sie sich gleich ein Tier aus, das künftig bei Ihnen artgerechte
Unterbringung, Beschäftigung, Zuwendung und Familienanschluss genießt.

Dafür bringen Sie mindestens 2 Stunden Zeit, Bargeld oder eine EC-Karte für die
Vermittlungsgebühr, unbedingt einen gültigen Personalausweis und gegebenenfalls eine
Einverständniserklärung Ihres Vermieters mit.

Tierheim Sonnenau e. V.
info@tierheim-sonnenau.de
Öffnungszeiten: Mi.-So. 14:00-16:00 Uhr, Mo. und Di. geschlossen`,
    instructions: aufgabe(
      "Sie möchten gerne ein Haustier. Bitten Sie in einem Schreiben an das Tierheim um nähere Informationen.",
    ),
    leitpunkte: [
      "Beschreiben Sie ausführlich, was für ein Tier Sie sich wünschen.",
      "Erklären Sie, warum Sie ein Tier aus dem Tierheim und nicht vom Züchter möchten.",
      "Beschreiben Sie Ihre Lebens- und Wohnsituation und erkundigen Sie sich, welches Tier zu Ihnen passen könnte.",
      "Fragen Sie nach Details der Vermittlung.",
    ],
    sourceFile: "telc-uebungstest-31.png",
  },
  {
    ...base,
    title: "Anfrage zur Vermittlung eines Haustiers",
    taskIntro: "In der Zeitung haben Sie folgende Anzeige gelesen:",
    stimulusText: `TIERE SUCHEN EIN LIEBEVOLLES ZUHAUSE
TIERHEIM SONNENAU E. V.

Sie sind tierlieb, wollen sich engagieren und uns nicht nur mit Spenden unterstützen?

Dann suchen Sie bei uns ein Kleintier (Hund, Katze, Kaninchen, Hamster oder Vogel)
aus und geben Sie ihm ein neues Zuhause.

Dafür bringen Sie mindestens 2 Stunden Zeit, einen gültigen Ausweis sowie Bargeld
oder eine EC-Karte für die Vermittlungsgebühr mit.

Wir freuen uns auf Ihren Besuch!

Tierheim Sonnenau e. V.
info@tierheim-sonnenau.de
Öffnungszeiten: Mi.-So. 14:00-16:00 Uhr, Mo. und Di. geschlossen`,
    instructions: aufgabe(
      "Sie möchten gerne ein Haustier. Bitten Sie in einem Schreiben an das Tierheim um nähere Informationen.",
    ),
    leitpunkte: [
      "Beschreiben Sie ausführlich, was für ein Tier Sie sich wünschen.",
      "Erklären Sie, warum Sie ein Tier aus dem Tierheim und nicht aus der Zoohandlung möchten.",
      "Beschreiben Sie Ihre Lebens- und Wohnsituation und erkundigen Sie sich, welches Tier zu Ihnen passen könnte.",
      "Fragen Sie nach Details der Vermittlung.",
    ],
    sourceFile: "telc-uebungstest-32.png",
  },
];
