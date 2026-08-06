/**
 * TELC B1 "Schriftlicher Ausdruck" tasks, modelled on the practice papers in
 * exam-materials/telc/b1/ (telc-uebungstest-01..17.png).
 *
 * As in the B2 bank, the stimulus texts here are ORIGINAL. A B1 task prints a personal
 * letter of well over a hundred words, and seventeen of those transcribed into a database
 * that gets deployed is precisely what exam-materials/README.md warns against.
 *
 * Each letter was written from the task's *situation* only - a friend has found a garden
 * and offers to share it - rather than from the paper's sentences, so every name, town,
 * job, date and detail below is invented and the wording is nowhere a paraphrase of the
 * source. Paraphrasing was the first attempt and it was not enough: a rewrite that keeps
 * the original's sentence order and swaps individual words still reproduces the
 * expression, which is what copyright covers. The Leitpunkte are written to fit these
 * letters rather than the papers'.
 *
 * What the format keeps, because format is not expression: the Brief-then-Aufgabe shape,
 * the informal register, the `Liebe(r) ........` opening the papers use so the candidate
 * fills in a name, four Leitpunkte, and the everyday subjects a B1 candidate is expected
 * to handle.
 *
 * `sourceFile` therefore records the paper each task's SHAPE follows, not a paper it was
 * copied from. Kept so the bank can be checked against the real spread of task types.
 *
 * Titles are ours — the originals are all just "Schriftlicher Ausdruck".
 *
 * Every task here is B1, informal (du), four Leitpunkte, 80-100 words, 30 minutes.
 *
 * `requiresSubject` is false throughout, even though most of these papers tell the
 * candidate to think of "eine passende Betreff". telc's own B1 criteria set the
 * Textsorte for this task as a persönliche oder halbformelle E-Mail, for which the
 * formal letter's features - Absender, Empfänger, Datum, Betreffzeile - are "nicht
 * gefordert", so a missing Betreff must not cost marks under Kriterium II. The flag
 * is decided by the Textsorte, not by the paper's advice: the one formal B1 task in
 * seed.ts (a reply to a Sprachschule, register "SIE") does still set it true.
 */
import type { SeedPrompt } from "./seed-types";

const base = {
  institute: "TELC",
  level: "B1",
  register: "DU",
  minWords: 80,
  maxWords: 100,
} as const;

export const telcB1Prompts: SeedPrompt[] = [
  {
    ...base,
    title: "Andreas' neue Wohnung",
    taskIntro: "Ein Bekannter hat Ihnen folgenden Brief geschrieben:",
    stimulusAuthor: "Andreas",
    stimulusText: `Liebe(r) ........

ich melde mich endlich wieder - die letzten Wochen waren bei mir ziemlich chaotisch.

Der Grund: Ich habe die Wohnung gewechselt. In der alten war das Bad winzig, und die Heizung fiel jeden Winter mindestens einmal aus. Die neue liegt zwei Straßen weiter, hat Fenster nach Süden und einen Abstellraum für mein Fahrrad. Die Küche haben mein Bruder und ich selbst eingebaut; wir haben vier Wochenenden dafür gebraucht.

Am meisten freut mich der eigene Schreibtisch. Bisher habe ich alles am Küchentisch erledigt. Jetzt steht dort der Rechner, und abends bearbeite ich meine Fotos. Sitzt du auch viel am Rechner, oder eher selten?

Ab Juni habe ich Platz für Gäste. Kommst du mal vorbei?

Herzlich
Andreas`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Wie oft und wofür Sie den Rechner benutzen",
      "Etwas über Ihre eigene Wohnung",
      "Ob Sie Andreas im Juni besuchen möchten",
      "Was es bei Ihnen Neues gibt",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-01.png",
  },
  {
    ...base,
    title: "Der neue Kollege aus Spanien",
    taskIntro:
      "Sie haben im Urlaub Andreas kennengelernt. Er hat Ihnen folgende E-Mail geschrieben:",
    stimulusAuthor: "Andreas",
    stimulusText: `Liebe(r) ........

endlich ein ruhiger Moment zum Schreiben. Kaum war ich zurück, lag auf meinem Schreibtisch Arbeit für zwei Wochen - so fühlt es sich jedenfalls an.

In unserer Abteilung hat jemand angefangen: Miguel, im Frühjahr aus Sevilla hergezogen. Seit Montag teilen wir uns ein Zimmer. Nach Jahren allein finde ich das angenehm, auch wenn ich mich erst daran gewöhnen muss, dass jemand mithört, wenn ich telefoniere.

Nur hat Miguel außerhalb der Firma kaum Kontakte. Er sagt, am Wochenende sei ihm die Stadt zu still. Ich überlege, ein paar Leute aus der Abteilung zu mir einzuladen, damit er jemanden kennenlernt. Hältst du das für eine gute Idee?

Viele Grüße
Andreas`,
    instructions: "Antworten Sie Andreas. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Ihr Rat, wie Andreas seinem Kollegen helfen kann",
      "Ob Sie lieber allein oder mit Kollegen arbeiten",
      "Wie Ihr letzter Urlaub war",
      "Was es bei Ihnen Neues gibt",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-02.png",
  },
  {
    ...base,
    title: "Ferienhaus im Schwarzwald",
    taskIntro: "Eine Bekannte hat Ihnen folgenden Brief geschrieben:",
    stimulusAuthor: "Petra",
    stimulusText: `Liebe(r) ........

ich platze fast vor Freude und muss dir sofort schreiben!

Meine Tante hat sich gestern gemeldet. Ihr gehört im Schwarzwald ein altes Bauernhaus, das den ganzen August leer steht. Wir dürfen es umsonst benutzen, und ich darf Leute mitbringen - so viele, wie hineinpassen.

Als Kind war ich einmal dort: dicke Mauern, ein Ofen in der Stube, hinter dem Haus führt ein Weg direkt in den Wald. Bis zum nächsten Dorf läuft man zwanzig Minuten, und das Telefon hat fast nirgends Empfang. Genau deshalb wäre es perfekt.

Gib mir bitte bis Ende des Monats Bescheid, dann kann ich meiner Tante antworten. Es wäre großartig, wenn du dabei wärst!

Herzliche Grüße
Petra`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Ob Sie im August mitkommen möchten",
      "Wie Sie anreisen würden",
      "Was Sie dort gemeinsam unternehmen könnten",
      "Wen Sie gern mitbringen würden",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-03.png",
  },
  {
    ...base,
    title: "Sophies neuer Job in Würzburg",
    taskIntro: "Sie haben folgende E-Mail von Ihrer Freundin Sophie bekommen:",
    stimulusAuthor: "Sophie",
    stimulusText: `Liebe(r) ........

es ist viel zu lange her, dass wir voneinander gehört haben. Wie läuft es bei dir?

Seit Anfang März bin ich nun in Würzburg. Die Stelle war die richtige Entscheidung: Die Aufgaben wechseln ständig, und im Büro wird viel gelacht.

Schwierig ist alles danach. Wenn ich abends die Tür hinter mir zuziehe, kenne ich in dieser Stadt keinen Menschen. Am Samstag war ich zweimal spazieren und einmal einkaufen - mehr ist nicht passiert. Wie hast du das gemacht, als du irgendwo neu warst? Über einen Verein, über Nachbarn?

Und falls du magst: Ein Wochenende hier würde dir gefallen, glaube ich. Sag einfach, wann es dir passt.

Viele Grüße
Sophie`,
    instructions: "Antworten Sie Sophie. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Was es bei Ihnen Neues gibt",
      "Was Sie in Ihrer Freizeit gern machen",
      "Ihr Tipp, wie Sophie neue Leute kennenlernt",
      "Antwort auf Sophies Einladung",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-04.png",
  },
  {
    ...base,
    title: "Veras Weg zur Arbeit",
    taskIntro: "Eine Freundin hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Vera",
    stimulusText: `Liebe(r) ........

wie läuft es bei euch zu Hause?

Seit Kurzem habe ich eine neue Stelle, und die Arbeit selbst gefällt mir gut. Nur der Weg dorthin bringt mich zur Verzweiflung. Mit dem Rad wäre die Strecke die schönste, aber die Landstraße hat keinen Seitenstreifen, und frühmorgens fahren dort die Lastwagen.

Also nehme ich den Zug. Einmal muss ich umsteigen, und hat der erste zwei Minuten Verspätung, warte ich zwanzig auf den zweiten. Vorher setze ich noch meine Tochter bei der Tagesmutter ab - du kannst dir denken, wann bei mir der Wecker klingelt.

Und du, wie legst du deinen Weg zur Arbeit zurück?

Sollen wir bald einmal etwas zusammen unternehmen?

Liebe Grüße
Vera`,
    instructions: "Antworten Sie Vera. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Was es bei Ihnen Neues gibt",
      "Wie Sie zur Arbeit oder zum Kurs kommen",
      "Was Sie über Veras neue Stelle wissen möchten",
      "Ihr Vorschlag für eine gemeinsame Unternehmung",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-05.png",
  },
  {
    ...base,
    title: "Gemeinsam verreisen",
    taskIntro: "Sie haben von einer Freundin folgenden Brief erhalten:",
    stimulusAuthor: "Annika",
    stimulusText: `Liebe(r) ........

hattest du auch so ein verregnetes Wochenende? Ich bin kaum vor die Tür gekommen und habe stattdessen zwei Schubladen ausgeräumt, die seit dem Umzug zu waren.

Zu unserer Reise: Ich bin dabei! Weißt du schon, wohin? Mir gefällt beides, Küste und Stadt. Nur herumsitzen möchte ich nicht - ein bisschen wandern oder schwimmen sollte möglich sein.

Eine Bitte habe ich allerdings. Wir sollten aufs Geld achten. Im Februar ist meine Waschmaschine kaputtgegangen, und die neue war teurer als gedacht. Fällt dir etwas ein, wie man so etwas günstig hinbekommt? Auf ein schickes Hotel lege ich wirklich keinen Wert.

Melde dich, dann fangen wir an zu planen.

Viele Grüße
Annika`,
    instructions: "Antworten Sie Annika. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Wie Sie Ihr Wochenende verbracht haben",
      "Wohin Sie gern reisen würden",
      "Was Sie im Urlaub gern machen",
      "Ihre Ideen, wie die Reise günstig bleibt",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-06.png",
  },
  {
    ...base,
    title: "Abschlussfest für den Kurs",
    taskIntro: "Eine Bekannte hat Ihnen die folgende E-Mail geschrieben:",
    stimulusAuthor: "Iris",
    stimulusText: `Liebe(r) ........

die Prüfung ist überstanden! Wie es gelaufen ist, weiß ich noch nicht genau, aber schlecht war es bestimmt nicht.

Nun liegt die Feier für unseren Kurs bei mir, und ich merke gerade, dass ich keine Ahnung habe, wo man anfängt. Du hast im vorigen Jahr für deine Gruppe etwas Ähnliches auf die Beine gestellt - erzähl mir, wie du vorgegangen bist.

Mein erster Gedanke war ein Lokal: Dann bestellt sich jeder, was er mag, und hinterher räumt niemand auf. Andererseits wäre gemeinsames Kochen persönlicher. Wozu würdest du raten?

Bleibt die Musik. Wir sind vierzehn Leute aus neun Ländern, da hat jeder einen anderen Geschmack.

Schreib mir bald.

Liebe Grüße
Iris`,
    instructions: "Antworten Sie Ihrer Bekannten. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Reaktion auf Iris' Prüfung",
      "Ihre Meinung: Lokal oder gemeinsam kochen",
      "Welche Musik Sie vorschlagen",
      "Ihre eigenen Pläne für die Ferien",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-07.png",
  },
  {
    ...base,
    title: "Evas Traumberuf als Journalistin",
    taskIntro:
      "Eine Bekannte aus der Schweiz hat eine neue Stelle. Sie hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Eva",
    stimulusText: `Liebe(r) ........

wie steht es um dein Deutsch? Machst du Fortschritte?

Bei mir hat sich etwas Großes getan: Seit dem Frühjahr schreibe ich für die Zeitschrift VIA. Als Journalistin! Genau das wollte ich schon mit fünfzehn werden, und manchmal muss ich mich kneifen.

Unsere Leserinnen und Leser sind meist zwischen achtzehn und dreißig. Entsprechend geht es um Ausbildung, Studium und Arbeit, daneben um Sport, Musik und Reisen. Im Herbst starten wir eine Reihe über Berufsträume: Wir wollen wissen, welchen Beruf die Leute ergreifen würden, wenn das Geld keine Rolle spielte.

Also frage ich dich dasselbe. Welcher Beruf wäre es bei dir? Und soll ich dir eine Ausgabe schicken?

Herzliche Grüße
Eva`,
    instructions:
      "Schreiben Sie Ihrer Bekannten einen Antwortbrief, der die folgenden vier Punkte enthält:",
    leitpunkte: [
      "Ihre Fortschritte beim Deutschlernen",
      "Reaktion auf Evas neue Stelle",
      "Was es bei Ihnen Neues gibt",
      "Ihr Traumberuf und warum",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-08.png",
  },
  {
    ...base,
    title: "Tamaras neue Arbeitsstelle",
    taskIntro: "Eine Freundin hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Tamara",
    stimulusText: `Liebe(r) ........

von Dir habe ich ewig nichts gelesen, und langsam frage ich mich, ob bei Euch alles seinen gewohnten Gang geht.

Beruflich hat sich hier einiges verschoben. Im Frühjahr habe ich die Firma gewechselt. Die Arbeit ist deutlich spannender als vorher, dafür sind die Tage lang, und ich sitze öfter im Zug als am Schreibtisch.

Genau darum schreibe ich Dir: Im November führt mich ein Termin in Eure Richtung. An dem Abend hätte ich Zeit. Wir könnten essen gehen oder einfach bei Euch sitzen und reden. Deine Familie habe ich ja noch nie gesehen, das ist längst überfällig.

Lass mich bitte bald wissen, ob das passt!

Herzliche Grüße
Deine Tamara`,
    instructions: "Antworten Sie Tamara. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Warum Sie so lange nicht geschrieben haben",
      "Ihr Vorschlag für den Abend im November",
      "Was Sie über Tamaras neue Stelle wissen möchten",
      "Wen Sie zum Treffen mitbringen möchten",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-09.png",
  },
  {
    ...base,
    title: "Thomas' Ausflug mit Bus und Schiff",
    taskIntro: "Sie haben von Ihrem Freund folgende E-Mail erhalten:",
    stimulusAuthor: "Thomas",
    stimulusText: `Liebe(r) ........

nach unserem gelungenen Tag im vergangenen Jahr möchte ich wieder etwas auf die Beine stellen. Haltet euch den Termin bitte frei!

Eines vorweg: Beim Fußball habe ich mir den Knöchel gebrochen. Er ist noch nicht in Ordnung, weite Strecken zu Fuß fallen für mich also vorerst aus. Deshalb wird es diesmal bequem - erst ein Stück mit dem Bus, danach eine Fahrt auf dem Wasser. Bei Sonne wird das ein herrlicher Tag.

Das Ziel behalte ich für mich. Lasst euch überraschen.

Termin: Samstag in zwei Wochen
Treffpunkt: 9:30 Uhr vor meiner Haustür

Gebt mir bitte Bescheid, ob ihr dabei seid!

Bis dahin
Thomas`,
    instructions: "Antworten Sie Thomas. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Reaktion auf Thomas' Verletzung",
      "Ob Sie beim Ausflug dabei sind",
      "Was Sie noch über den Ausflug wissen möchten",
      "Ihr Vorschlag für schlechtes Wetter",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-10.png",
  },
  {
    ...base,
    title: "Grüße aus Rom",
    taskIntro: "Ihr Freund Jan hat Ihnen folgende E-Mail geschrieben:",
    stimulusAuthor: "Jan",
    stimulusText: `Liebe(r) ........

ich schreibe dir vom Balkon meiner Pension in Rom. Dass mich diese Stadt jedes Mal umhaut, ist dir bekannt. Seit Montag laufe ich mir die Füße wund: Kirchen, Märkte, versteckte Innenhöfe - und mittags jedes Mal etwas anderes auf dem Teller. Am Mittwoch bin ich zufällig in ein Konzert im Park geraten, ohne die Gruppe vorher zu kennen. Es war der schönste Abend der Woche.

In drei Tagen ist Schluss, dann sitze ich wieder am Schreibtisch.

Sag mal, in welcher Stadt fühlst du dich am wohlsten? Und weißt du schon, wohin es dich als Nächstes zieht? Wir sollten uns wirklich bald wiedersehen.

Herzliche Grüße
Jan`,
    instructions: "Antworten Sie Jan. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Ihre Lieblingsstadt und warum",
      "Welche Musik Sie gern hören",
      "Ihre Pläne für den nächsten Urlaub",
      "Ihr Vorschlag für ein Treffen",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-11.png",
  },
  {
    ...base,
    title: "Janines Hochzeit im Oktober",
    taskIntro: "Sie haben folgenden Brief von einer Freundin erhalten:",
    stimulusAuthor: "Jennifer",
    stimulusText: `Liebe(r) ........

verzeih, dass ich mich erst heute melde - wir wollten uns doch regelmäßig schreiben, und dann kam hier ein Monat wie der andere dazwischen.

Es gibt aber einen schönen Anlass: Janine, meine jüngere Schwester, heiratet. Der Termin steht, es wird der zwölfte Oktober. Sie hat mich gebeten, im Freundeskreis schon einmal vorzuwarnen; die gedruckte Einladung bekommst du natürlich von ihr selbst.

Ihren Verlobten kennst du noch nicht. Er heißt Eddi, steht in der Küche eines Restaurants am Hafen und ist der ganzen Familie längst ans Herz gewachsen.

Damit wir planen können: Kommst du? Und bringst du jemanden mit?

Herzliche Grüße
Jennifer`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Reaktion auf die Neuigkeit",
      "Ob Sie zur Hochzeit kommen",
      "Ihre Frage zur Übernachtung",
      "Ihre Idee für ein Hochzeitsgeschenk",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-12.png",
  },
  {
    ...base,
    title: "Musikfestival in Rüdesheim",
    taskIntro: "Sie haben von einer Freundin folgenden Brief erhalten:",
    stimulusAuthor: "Sonja",
    stimulusText: `Liebe(r) ........

bald sind Ferien, und dass du herkommst, ist für mich das Beste daran. Einen Vorschlag hätte ich auch schon:

Nicht weit von hier, in Rüdesheim, findet im Juli ein Festival statt. Die Bühne steht direkt über dem Fluss, und in diesem Jahr treten Bands aus acht Ländern auf.

Konzerte im Freien sind für mich das Schönste am Sommer: barfuß im Gras, Musik bis in die Nacht, und morgens trinken alle zusammen Kaffee.

Zwei Dinge müssen wir klären. Nehmen wir die Bahn, oder soll ich uns hinfahren? Und schlafen wir im Zelt neben dem Gelände oder lieber in einem Zimmer in der Stadt? Sag mir bitte auch, ob du jemanden mitbringst.

Herzliche Grüße
Sonja`,
    instructions: "Antworten Sie Sonja. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Wie Sie zum Festival reisen möchten",
      "Ob Sie im Zelt oder in der Stadt schlafen möchten",
      "Ob Sie jemanden mitbringen",
      "Was Sie sonst noch zusammen unternehmen möchten",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-13.png",
  },
  {
    ...base,
    title: "Besuch einer Schülerin aus Ihrem Land",
    taskIntro: "Sie haben von einer Bekannten folgende E-Mail erhalten:",
    stimulusAuthor: "Caroline",
    stimulusText: `Liebe(r) ........

lange nichts von dir gelesen - ich hoffe, dir geht es gut. Heute komme ich mit einer Bitte.

Im Mai nehmen wir für vierzehn Tage eine Schülerin bei uns auf. Sie ist sechzehn, kommt aus deinem Land und bekommt das Zimmer meines Sohnes, der gerade im Ausland studiert. Wir möchten natürlich, dass sie sich bei uns wohlfühlt.

Nur wissen wir über ihre Heimat so gut wie nichts. Was isst man bei euch morgens? Gibt es beim Essen oder beim Begrüßen Regeln, die wir kennen sollten? Und wovon lassen wir besser die Finger, damit es ihr nicht unangenehm wird?

Für jeden Hinweis bin ich dankbar.

Liebe Grüße
Caroline`,
    instructions: "Antworten Sie Caroline. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Reaktion auf den Besuch der Schülerin",
      "Was man bei Ihnen typischerweise isst",
      "Gewohnheiten, die Caroline kennen sollte",
      "Warum Sie so lange nicht geschrieben haben",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-14.png",
  },
  {
    ...base,
    title: "Einen Garten teilen",
    taskIntro: "Sie haben von einer Freundin folgenden Brief erhalten:",
    stimulusAuthor: "Nadja",
    stimulusText: `Liebe(r) ........

bei uns hat sich etwas getan, und ich glaube, für dich könnte es auch interessant sein.

Seit Ostern gehört uns ein Stück Land in der Kleingartenanlage hinter dem Sportplatz. Es ist größer, als wir dachten - allein schaffen wir die Arbeit nicht, und die Hälfte liegt bisher brach.

Deshalb meine Frage: Möchtest du mitmachen? Die Pacht ist gering, geteilt merkt man sie kaum. Du hättest deine eigene Ecke und könntest anbauen, was dir gefällt. Auf dem Gelände stehen ein paar Beerensträucher, es gibt einen Wasseranschluss und eine Hütte, in der Werkzeug und zwei alte Liegestühle untergebracht sind.

Überleg es dir und ruf mich an.

Alles Liebe
Deine Nadja`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Reaktion auf Nadjas Vorschlag",
      "Ihre Fragen zum Garten",
      "Wie Sie zum Garten kommen würden",
      "Was es bei Ihnen Neues gibt",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-15.png",
  },
  {
    ...base,
    title: "Nicoles Bruder und der Fernseher",
    taskIntro:
      "Eine Freundin beschreibt in einem Brief, welche Probleme sie mit ihrem Bruder hat, und bittet Sie um Rat:",
    stimulusAuthor: "Nicole",
    stimulusText: `Liebe(r) ........

es tut mir leid, dass du so lange nichts von mir gehört hast. Mein Bruder wohnt zurzeit bei uns. Er lebt seit Jahren in Kanada und bleibt diesmal bis Ende Juni. Wir haben uns viel vorgenommen: Radtouren, Kino, einmal in der Woche kochen wir zusammen.

Eine Sache raubt mir allerdings den letzten Nerv. Läuft im Fernsehen irgendein Wettkampf, ist er für den Rest des Tages verloren. Vorhin hatten wir dreißig Grad und blauen Himmel, und er saß bei zugezogenen Vorhängen davor.

Soll ich es ansprechen? Streiten möchte ich nicht, denn wer weiß, wann wir uns wiedersehen. Wie würdest du damit umgehen?

Herzliche Grüße
Nicole`,
    instructions:
      "Schreiben Sie Ihrer Bekannten einen Antwortbrief, der die folgenden vier Punkte enthält:",
    leitpunkte: [
      "Ihr Rat für Nicole",
      "Eigene Erfahrungen mit Geschwistern oder Freunden",
      "Was Sie über das Verhalten des Bruders denken",
      "Was Sie selbst gern gemeinsam mit anderen machen",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-16.png",
  },
  {
    ...base,
    title: "Maras Autoreise mit ihrem neuen Freund",
    taskIntro: "Eine Freundin hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Mara",
    stimulusText: `Liebe(r) ........

meldest Du Dich eigentlich noch? Seit Monaten kommt nichts von Dir, und wann wir uns zuletzt gesehen haben, weiß ich gar nicht mehr.

Vielleicht ändert sich das jetzt. Ende des Monats nehmen wir uns zwei Wochen frei, packen das Auto und fahren einfach los, ohne feste Route. Unterwegs würden wir gern bei Dir haltmachen. Es wird höchste Zeit, dass Du Simon kennenlernst - wir sind seit dem Winter zusammen.

Zwei Fragen also: Wo könnten wir uns treffen? Und kennst Du bei Euch eine bezahlbare Unterkunft für zwei Nächte? Ein einfacher Gasthof reicht uns völlig.

Antworte mir diesmal bitte schnell!

Herzliche Grüße
Mara`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Warum Sie so lange nicht geschrieben haben",
      "Ihr Vorschlag, wo Sie sich treffen könnten",
      "Eine Empfehlung für eine Unterkunft",
      "Reaktion darauf, dass Mara ihren Freund mitbringt",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-17.png",
  },
];
