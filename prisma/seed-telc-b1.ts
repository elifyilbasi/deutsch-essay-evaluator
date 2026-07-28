/**
 * TELC B1 "Schriftlicher Ausdruck" tasks, transcribed from the practice papers in
 * exam-materials/telc/b1/ (telc-uebungstest-01..17.png).
 *
 * Transcribed as printed, including the papers' own typos (e.g. "Musikfestvial",
 * "Grätschet"), so what a learner sees matches the paper they'll sit. Titles are
 * ours — the originals are all just "Schriftlicher Ausdruck".
 *
 * Every task here is B1, informal (du), four Leitpunkte, 80-100 words, 30 minutes.
 * `requiresSubject` is true where the paper asks for a Betreff.
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

es tut mir wirklich leid, dass ich dir schon so lange nicht geschrieben habe. Bei mir ist im letzten Monat ziemlich viel los gewesen.

Vor drei Wochen bin ich nämlich in eine neue Wohnung gezogen, weil die alte für mich zu klein war. Mittlerweile habe ich mich schon sehr schön eingerichtet, mit ein paar neuen Möbeln usw. Ich fühle mich wirklich wohl! Hast du nicht Lust. Im Sommer zu mir zu Besuch zu kommen?

In meiner neuen Wohnung habe ich jetzt auch ein kleines Arbeitszimmer für meine ganzen Bücher und den Schreibtisch mit dem Computer. Wie ist das bei dir? Machst du eigentlich viel am Computer?
Lass doch mal wieder was von dir hören!

Liebe Grüße und bis bald
Andreas`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu den folgenden vier Punkten:",
    leitpunkte: [
      "Ihre Erfahrungen mit dem Computer",
      "Etwas über Ihre Wohnung",
      "Ob Sie Andreas besuchen möchten",
      "Was es bei Ihnen Neues gibt",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-01.png",
  },
  {
    ...base,
    title: "Der neue Kollege aus Spanien",
    taskIntro: "Sie haben im Urlaub Andreas kennengelernt. Er hat Ihnen folgende E-Mail geschrieben:",
    stimulusAuthor: "Andreas",
    stimulusText: `Liebe(r) ........

Heute habe ich Zeit, dir ein paar Zeilen zu schreiben. Der Urlaub war so schön, aber seit ich zurück bin, habe ich im Büro sehr viel Arbeit. Bestimmt brauche ich schon bald wieder Urlaub!
Während ich weg war, hat sich hier übrigens einiges geändert: Es gibt einen neuen Kollegen, er heißt Roberto. Was aber die größte Veränderung ist:
Er arbeitet mit mir in meinem Büro, das heißt, ich habe endlich jemanden, mit dem ich mich zwischendurch auch ein bisschen unterhalten kann! Roberto ist aus Spanien hierher gezogen. Er kennt noch niemanden hier, außer mir natürlich, und ist meistens allein. Denkst du, dass ich ihn und ein paar andere Arbeitskollegen einmal einladen sollte? Was würdest du tun? Na gut, für heute muss ich Schluss machen. Melde dich doch bald einmal bei mir!

Viele Grüße
Andreas`,
    instructions: "Antworten Sie Andreas. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Vorschlag wie Andreas seinem Arbeitskollegen helfen kann",
      "Wie Sie am liebsten arbeiten (alleine oder mit Kollegen)",
      "Was Sie nach dem Urlaub gemacht haben",
      "Was es bei Ihnen Neues gibt",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-02.png",
  },
  {
    ...base,
    title: "Ferienhaus im Schwarzwald",
    taskIntro: "Eine Bekannte hat Ihnen folgenden Brief geschrieben:",
    stimulusAuthor: "Petra",
    stimulusText: `Liebe(r) ........

Ich habe eine tolle Überraschung. stelle dir vor, was mir mein Onkel angeboten hat. Er rief mich am Samstag an. Er hat ein großes Ferienhaus im Schwarzwald. Das Haus kann ich für die Ferien kostenlos haben. Ich kann auch Freunde mitbringen! Wäre das nichts für uns? Wir könnten uns alle dort treffen. Du, deine Eltern und Freunde, und ich mit meiner Familie und meinen Freunden. Ich würde mich wahnsinnig freuen, wenn das klappen würde. Bitte schreibe mir so schnell du kannst, damit wir alles planen können. Urlaub im Schwarzwald - das wird traumhaft schön!

Herzliche Grüße
Petra`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu den folgenden Punkten:",
    leitpunkte: [
      "Warum Sie gern nach Deutschland kommen möchten",
      "Wie Sie anreisen wollen",
      "Was Sie gemeinsam machen könnten",
      "Wen Sie mitbringen möchten",
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

wir haben lange nichts mehr voreinander gehört. Ich hoffe, es geht dir gut. Gibt es bei dir Neuigkeiten? Ich bin nun schon seit zwei Monaten in Würzburg, und mein neuer Job gefällt mir sehr gut. In der Firma fühle ich mich wohl, mit meinen Kollegen verstehe ich mich prima und die Arbeit macht mir großen Spaß.

Allerdings habe ich ein Problem: Außer meinen Kollegen kenne ich hier in der Stadt noch niemanden. In meiner Freizeit bin ich oft allein und weiß nicht, was ich machen soll. Wie könnte ich neue Leute kennenlernen? Hast du vielleicht einen Tipp für mich?
Würzburg ist wirklich eine schöne Stadt mit vielen Sehenswürdigkeiten. Hast du Lust, mich mal an einem Wochenende zu besuchen? Ich würde mich sehr freuen.

Viele Grüße
Sophie`,
    instructions: "Antworten Sie Sophie. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Was es Neues bei Ihnen gibt",
      "Was Sie selbst gerne in Ihrer Freizeit machen",
      "Tipps für Sophie",
      "Reaktion auf den Vorschlag",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-04.png",
  },
  {
    ...base,
    title: "Veras Weg zur Arbeit",
    taskIntro: "Eine Freundin hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Vera",
    stimulusText: `Liebe(r) ........

Wie geht es dir und deiner Familie?

Bei mir läuft alles prima. Endlich habe ich eine neue Arbeitsstelle. Ich habe nur ein kleines Problem: Es ist ein bisschen zu weit, um zu Fuß zu gehen.

Und der Bus fährt nur alle 30 Minuten. Früher bin ich meist mit dem Fahrrad gefahren, aber hier gibt es keine Fahrradwege. Und da ist ja auch noch mein Daniel, den ich morgens in den Kindergarten bringen muss.

Der liegt zum Glück gleich neben meiner neuen Firma. – Wie kommst du denn zur Arbeit oder zum Deutschkurs?

Wollen wir uns nicht mal wieder treffen und alle zusammen was unternehmen? Ich würde mich freuen.

Liebe Grüße
Vera`,
    instructions: "Antworten Sie Vera. Schreiben Sie etwas zu allen vier Punkte:",
    leitpunkte: [
      "Was es bei Ihnen Neues gibt",
      "Wie Sie zur Arbeit kommen",
      "Was Sie über Veras neue Stelle wissen wollen",
      "Vorschlag für gemeinsame Unternehmung",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-05.png",
  },
  {
    ...base,
    title: "Gemeinsam verreisen",
    taskIntro: "Sie haben von einer Freundin folgenden Brief erhalten:",
    stimulusAuthor: "Annika",
    stimulusText: `Liebe(r) ........

Wie geht's dir? Hattest du ein schönes Wochenende? Hier hat es die ganze Zeit geregnet, deshalb bin ich zuhause geblieben.

Du hattest vorgeschlagen, dass wir im Sommer zusammen verreisen könnten. Die Idee finde ich super! An welches Reiseziel denkst du? Ich bin gerne am Meer, mag aber auch Städterreisen. Wichtig ist für mich nur, dass ich auch ein bisschen Sport machen kann. Die Reise sollte aber nicht zu viel kosten, denn ich habe vor Kurzem schon viel für eine Autoreparatur bezahlen müssen. Was meinst du: wie können wir günstig Urlaub machen? Es muss ja kein Luxushotel sein.

Schreib mir bald, dann können wir anfangen zu planen.

Viele Grüße
Annika`,
    instructions: "Antworten Sie Annika. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Was Sie am Wochenende unternommen haben",
      "Wohin Sie gerne reisen würden",
      "Was Sie im Urlaub gerne machen",
      "Wie man beim Reisen Geld sparen kann",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-06.png",
  },
  {
    ...base,
    title: "Abschlussfest für den Kurs",
    taskIntro: "Eine Bekannte hat Ihnen den folgende E-Mail geschrieben:",
    stimulusAuthor: "Iris",
    stimulusText: `Liebe(r) ........

endlich habe ich die Deutscheprüfung hinter mir. Ich glaube, es ist gut gelaufen. Jetzt soll für unseren Kurs eine Party organisieren. Du hast doch kürzlich erzählt, dass Du für Euren Kurs auch ein Abschlussfest organsiert hast. Sicher kannst du mir ein paar Tipps geben. Ich habe mir gedacht, wir könnten vielleicht in einem Restaurant feiern. Da kann jeder essen und trinken, was er will. Was meinst Du? Essen zu kochen ist doch ziemlich viel Arbeit. und natürlich brauchen wir Musik. Welche Musik ist am besten geeignet? Was schlägst Du vor?

Melde Dich bald.
Ich freue mich schon auf deine Antwort.

Liebe Grüße
Iris`,
    instructions: "Antworten Sie Ihrer Bekannten. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Reaktion auf die Prüfung",
      "Wo feiern? Restaurant - Ihre Meinung",
      "Welche Musik",
      "Urlaubpläne",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-07.png",
  },
  {
    ...base,
    title: "Evas Traumberuf als Journalistin",
    taskIntro: "Eine Bekannte aus der Schweiz hat eine neue Stelle. Sie hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Eva",
    stimulusText: `Liebe(r) ........

wie geht es denn so mit dem Deutsch lernen? Kommst du gut voran, und was machst du im Moment so? Stell dir vor, ich habe die neue Stelle bei der Zeitschrift VIA bekommen! ich arbeite jetzt als Journalistin, und das war ja immer mein Traumberuf!

VIA wird vor allem von jüngeren Leuten gelesen. Deshalb schreiben wir viel über Berufe und Ausbildungen und auch über Freizeit und Sport. Für die nächsten Hefte von VIA planen wir jetzt eine neue Serie über Berufs wünsche. Was ist eigentlich dein Traumberuf? Wenn du möchtest, schicke ich dir gerne einmal ein Grätschet von VIA, damit du siehst, was ich so mache.

Ich freue mich schon auf deine Antwort.

Herzliche Grüße
Eva`,
    instructions:
      "Schreiben Sie Ihrer Bekannten nun einen Antwortbrief, der die folgenden Punkte erhält:",
    leitpunkte: [
      "Fortschritte beim Deutsch Lernen",
      "Auf Evas neue Stelle reagieren",
      "Was es Neues bei Ihnen gibt",
      "Ihr Traumberuf",
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

wie geht es Dir? Du hast mir schon so lange nicht mehr geschrieben, dass ich mir Sorgen mache. Hoffentlich ist bei Euch alles in Ordnung. Es wird wirklich Zeit, dass wir uns wiedersehen.

Anfang des Jahres habe ich meinen Arbeitsplatz gewechselt. Meine neue Stelle ist sehr interessant, aber auch anstrengend.

Ich bin nun beruflich sehr viel unterwegs. Demnächst muss ich auch in Eure Gegend reisen. Dann könnten wir uns doch einmal am Abend treffen und gemeinsam etwas unternehmen. Wie findest Du meine Idee? Ich würde auch sehr gerne Deine Familie kennenlernen.

Bitte antworte mir bald!

Herzliche Grüße
Deine Tamara`,
    instructions: "Antworten Sie Tamara. Schreiben Sie etwas zu allen vier Punkte:",
    leitpunkte: [
      "Vorschlag zum Treffen",
      "Jemanden mitbringen",
      "Frage zur neuen Arbeitsstelle",
      "Warum Sie nicht geschrieben haben",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-09.png",
  },
  {
    ...base,
    title: "Thomas' Ausflug mit Bus und Schiff",
    taskIntro: "Sie haben von Ihnen Freund folgende E-Mail erhalten:",
    stimulusAuthor: "Thomas",
    stimulusText: `Liebe(r) ........

nach unserm schönen, gemeinsamen Erlebnis letztes Jahr möchte ich auch dieses Jahr wieder einen Ausflug für uns alle organisieren. Ich hoffe sehr, dass ihr Zeit habt und mitkommen könnt - ich freue mich schon jetzt, euch alle bald wieder zu sehen! Das Dumme ist nur, dass ich mir vor drei Wochen beim Basketball das Bein gebrochen habe und noch nicht so gut zu Fuß bin. Deshalb habe ich einen gemütlichen Ausflug mit Bus und Schiff geplant - hoffentlich ist dann auch das Wetter gut für die Schiffsfahrt! Wohin es geht, möchte ich euch aber noch nicht verraten - das soll eine Überraschung werden.

Termin: übernächster Samstag.

Zeit und Treffpunkt: 9:30 Uhr bei mir.

Bitte schreibt mir doch, ob ihr beim Ausflug dabei sein könnt!

Hoffentlich bis bald.

Thomas`,
    instructions: "Antworten Sie Thomas. Schreiben Sie etwas zu allen vier Punkten:",
    leitpunkte: [
      "Alternativvorschlag für Schlechtes Wetter",
      "Einladung annehmen",
      "Was Sie noch über den Ausflug wissen wollen",
      "Auf Sportunfall reagieren",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-10.png",
  },
  {
    ...base,
    title: "Grüße aus Rom",
    taskIntro: "Ihr Freund Jan hat Ihnen folgende E-Mail geschrieben:",
    stimulusAuthor: "Jan",
    stimulusText: `Liebe(r) ........

Ich sende Dir ganz viele Grüße aus Rom! Du weißt ja, wie sehr mir diese Stadt gefällt. Ich bin hier von morgens bis abends nur unterwegs. Diese Museen, Parks Plätze und natürlich das Essen – wunderbar! Gestern Abend war ich übrigens in einem Rockkonzert. Ich fand die Musik ganz toll und die Stimmung war super.

Doch Leider ist mein Urlaub schon fast vorbei und in drei Tagen muss ich wieder zurück nach Deutschland. Welche Stadt ist eigentlich Deine Lieblingsstadt? Hast du schon Pläne für Deinen nächsten Urlaub? Vielleicht können wir uns ja mal wieder treffen.

Herzliche Grüße
Jan`,
    instructions: "Antworten Sie Jan. Schreiben Sie etwas zu allen vier Punkte:",
    leitpunkte: [
      "Ihre Lieblingsstadt",
      "Welche Musik Sie mögen",
      "Ihre Pläne für den nächsten Urlaub",
      "Treffen mit Jan?",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-11.png",
  },
  {
    ...base,
    title: "Janines Hochzeit im Oktober",
    taskIntro: "Sie haben folgenden Brief von einer Freundin erhalten:",
    stimulusAuthor: "Jennifer",
    stimulusText: `Liebe(r) ........

Entschuldige, dass ich mich erst jetzt wieder melde. Ich weiß, wir hatten ausgemacht, uns öfter mal zu schreiben. Aber es war so viel los in letzter Zeit. Ich habe eine Neuigkeit für dich: Meine kleine Schwester Janine heiratet im Oktober, und ich habe ihr versprochen, schon mal allen Freunden zu schreiben und Bescheid zu sagen. Die offizielle Einladung bekommst du natürlich noch von ihr direkt. Eddi, ihr zukünftiger Mann, ist echt nett, und wir mögen ihn alle sehr. Er ist koch und arbeitet hier in einem Hotel.

Wir planen jetzt alles. Gib mir deshalb möglichst bald Bescheid, ob du kommst und mit wem.

Herzliche Grüße
Jennifer`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu den folgenden vier Punkten:",
    leitpunkte: [
      "Reaktion auf Neuigkeit",
      "Übernachtungsmöglichkeit",
      "Sie möchten zur Hochzeit kommen",
      "Hochzeitsgeschenk",
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

die Sommerferien kommen rasch näher und ich freue mich sehr, dass du mich besuchen kommst. Ich habe tolle Idee:

Ich möchte dich gerne zu einem Musikfestvial einladen, und zwar nach Rüdesheim (ca.50 km von Mainz). Dort spielen in diesem Sommer die besten internationalen Musikgruppen.

Ich finde Open-Air-Konzerte einfach toll: die friedliche Stimmung unter den Besuchern, die gute Music und einfach viele schöne Momente, die man nie mehr vergisst. Vor allem, wenn das Wetter gut ist, kann man das so richtig genießen.

Wir könnten mit dem Zug nach Rüdesheim fahren oder auch mein Auto nehmen. Was wäre dir lieber? Übernachten würde ich gern auf dem Festplatz. Was meinst du? Und willst du vielleicht noch jemanden mitbringen? Vielleicht hast du noch einen Wunsch, was du sonst noch hier machen möchtest? Schreibe mir bitte möglichst bald.
Ich freue mich schon auf deine Antwort.

Herzliche Grüße
Sonja`,
    instructions: "Antworten Sie Sonja. Schreiben Sie in Ihrem Brief etwas zu allen vier Punkten:",
    leitpunkte: [
      "Was sonst noch machen?",
      "Wie zum Festival reisen?",
      "Jemanden mitbringen?",
      "Übernachten: Reaktion auf Sonjas Vorschlag",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-13.png",
  },
  {
    ...base,
    title: "Besuch einer Schülerin aus Ihrem Land",
    taskIntro: "Sie haben von einer Bekannten folgenden E-Mail erhalten:",
    stimulusAuthor: "Caroline",
    stimulusText: `Liebe(r) ........

Du hast schon so lange nicht mehr geschrieben. Wie geht es dir? Heute habe ich eine Bitte. Vielleicht kannst du uns helfen?

Eine 16-jährige Schülerin aus deinem Land wird uns besuchen und zwei Wochen bei uns in Goldbach bleiben. Natürlich möchten wir, dass sie sich wohl fühlt. Dein Land kennen wir nur von deinen Erzählungen, denn wir waren selbst noch nicht da. Bitte gib uns ein paar Informationen Z.B über typische Gewohnheiten oder typisches Essen. Was können wir tun und wie können wir uns vorbereiten?

Wir freuen uns schon auf deine Antwort.

Schon einmal viele Dank und liebe Grüße

Caroline`,
    instructions: "Antworten Sie Caroline. Schreiben Sie etwas zu den folgenden vier Punkten:",
    leitpunkte: [
      "Reaktion auf den Besuch der Schülerin",
      "Vorschlag zu Essen und Trinken",
      "Warum Sie so lange nicht geschrieben haben",
      "Unternehmungen/Programm mit der Schülerin",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-14.png",
  },
  {
    ...base,
    title: "Einen Garten teilen",
    taskIntro: "Sie haben von einer Freundin folgenden Brief erhalten:",
    stimulusAuthor: "Nadja",
    stimulusText: `Liebe(r) ........

ich hoffe, dir geht's gut. stell dir vor, bei mir gibt es Neuigkeiten Du weißt doch, dass wir schon lange von einem Garten geträumt haben. Jetzt haben wir endlich einen am Stadtrand gefunden. Da er sehr groß ist. Wollte ich dich fragen, ob du nicht Lust hast den Garten mit uns zu teilen.

Die Miete ist gar nicht so hoch. Du könntest dort Salat und Gemüse anpflanzen, natürlich auch Blumen ganz wie du willst. Es gibt auch Obstbäume und eine große Wiese, auf der man sich einfach hinlegen, und wir könnten im Garten auch grillen. Was denkst du? Wäre das nicht toll.
Antworte mir bald.

Alles Liebe

Deine Nadja`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu den folgenden vier Punkten:",
    leitpunkte: [
      "Reaktion auf den Vorschlag",
      "Fragen zum Garten",
      "Weg zum Garten",
      "Was es bei Ihnen Neues gibt",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-15.png",
  },
  {
    ...base,
    title: "Nicoles Bruder und der Fernseher",
    taskIntro:
      "Eine Freundin beschreibt in einem Brief, welche Probleme sie mit ihrem Bruder hat und bittet Sie um Rat:",
    stimulusAuthor: "Nicole",
    stimulusText: `Liebe(r) ........

entschuldige, dass ich dir so lange nicht mehr geschrieben habe. Aber weißt du mein älterer Bruder, der schon lange im Ausland lebt, ist jetzt für zwei Monate bei uns. Wir unternehmen einiges zusammen, Z.B. gehen wir nachmittags ins Schwimmbad oder abends ins Kino.

Wir verstehen uns eigentlich ganz gut, aber dennoch habe ich ein Problem mit ihm: Wenn es im Fernsehen Sportsendungen gibt, dann bekomme ich ihn nicht mehr weg vom Fernseher! Er sitzt dann stundenlang nur da und sieht fern, ganz egal wie schön das Wetter draußen ist! Was soll ich bloß tun? Überhaupt nichts sagen oder soll ich mit ihm deswegen streiten? Er fährt bald wieder weg und ich möchte doch mit ihm zusammen sein. Was würdest du machen?

Hast du vielleicht ein paar Tipps oder Ratschläge für mich?

Herzliche Grüße
Nicole`,
    instructions:
      "Schreiben Sie Ihrer Bekannten einen Antwortbrief, der die folgenden Punkte enthält:",
    leitpunkte: [
      "Eigene Erfahrungen mit Geschwistern, Freunden, ...",
      "Tipps für Nicole",
      "Was Sie über den Bruder denken",
      "Was Sie selbst gern gemeinsam mit anderen machen",
    ],
    requiresSubject: true,
    sourceFile: "telc-uebungstest-16.png",
  },
  {
    ...base,
    title: "Maras Autoreise mit ihrem neuen Freund",
    taskIntro: "Eine Freundin hat Ihnen den folgenden Brief geschrieben:",
    stimulusAuthor: "Mara",
    stimulusText: `... , den ...

Liebe(r) …

wie geht es Dir? Warum hast Du in den letzten Wochen nicht mehr geschrieben? Leider haben wir uns ja auch schon sehr lange nicht mehr gesehen. Doch das kann sich bald ändern. Mein neuer Freund und ich haben in zwei Wochen Urlaub und möchten eine Reise mit dem Auto machen.
Dabei möchten wir Dich auch gerne treffen. Schließlich möchte ich Dir ja auch meinen Freund vorstellen. Vielleicht hast Du eine Idee, wo wir uns treffen könnten. Kannst Du uns auch ein schönes Hotel bei Euch in der Nähe empfehlen? Antworte mir bald!

Herzliche Grüße
Mara`,
    instructions: "Antworten Sie auf den Brief. Schreiben Sie etwas zu den folgenden Punkten:",
    leitpunkte: [
      "Hotel / Übernachtungsmöglichkeit",
      "Vorschlag zum Treffen",
      "Reaktion auf Maras neuen Freund",
      "Warum Sie lange nicht geschrieben haben",
    ],
    requiresSubject: false,
    sourceFile: "telc-uebungstest-17.png",
  },
];
