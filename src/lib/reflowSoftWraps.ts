/**
 * Joins the line breaks that only exist because the source file was hard-wrapped,
 * leaving the ones that carry meaning.
 *
 * Exam texts are stored as template literals in `prisma/seed-*.ts`, wrapped at roughly
 * 78 characters so the seed files stay readable. Two of those newlines are not the same
 * thing, and rendering could not previously tell them apart:
 *
 *   - a *soft wrap*, mid-sentence, an artefact of the editor's margin. Rendered with
 *     `whitespace-pre-wrap` it froze the advertisement at the width of the seed file —
 *     a paragraph stopping at 468px inside a 1088px card.
 *   - a *structural break*: the a)/b) options in the telc Aufgabe, an address block, a
 *     salutation, a signature. Collapsing these (a plain `<p>` does) ran the B2 options
 *     together into one sentence and lost the choice the candidate is being offered.
 *
 * The two are told apart by length, not punctuation. A hard wrap only ever happens near
 * the wrap column, so a line that reaches it and is followed by more text is a wrap;
 * a short line ended where it did because someone meant it to. Punctuation cannot decide
 * this: German capitalises every noun, so "…seit vielen Jahren als" / "Ernährungsberater
 * tätig." looks exactly like a deliberate break to a rule reading the next line's case,
 * and a wrapped line may well end in a full stop mid-paragraph.
 *
 * Output is still meant to be rendered with `whitespace-pre-wrap`, which is what makes
 * the surviving breaks visible.
 */

/**
 * Shortest line that can be the result of wrapping. Seed texts wrap at ~78; the real
 * lines that must survive (`a) mindestens drei der folgenden Punkte`, `70173 Stuttgart`,
 * `Liebe Grüße`) are far shorter, so the gap is wide and the threshold is not delicate.
 */
const WRAP_COLUMN = 60;

/**
 * A line opening with one of these is a new item, however long the line above it ran.
 * The B2 adverts carry 55 bullet lines between them, and joining "• Unterbringung in
 * Jugendherbergen" onto the item above merges two things the advert lists separately.
 * Covers the telc Aufgabe's own a)/b) options too.
 */
const LIST_MARKER = /^\s*(?:[•▪‧*·]|[-–—]\s|[a-z]\)|\d+[.)])/;

/**
 * A colon ending a line introduces what follows, rather than being a place a wrap
 * happened to land: the price list under "entscheide dich dann für eines unserer
 * Angebote:", the items under "Wir brauchen noch Verstärkung … z. B.:". Of the four
 * long colon-terminated lines in the seed data, three open a list.
 */
const INTRODUCES_BLOCK = /:$/;

export function reflowSoftWraps(text: string, wrapColumn: number = WRAP_COLUMN): string {
  const lines = text.split("\n");
  const out: string[] = [];
  /**
   * Length of the *source* line that ended the current output line, not of the joined
   * result. Measuring the accumulation instead would make a paragraph keep swallowing
   * whatever follows it: once two fragments are joined the total always clears the wrap
   * column, so a short final line ("Herzliche Grüße") sitting under a wrapped paragraph
   * would be pulled into it. The question is only ever whether the *previous source
   * line* ran to the margin.
   */
  let previousSourceLength = 0;

  for (const line of lines) {
    const previous = out[out.length - 1];
    const continuesPrevious =
      previous !== undefined &&
      // A blank line is a paragraph break: it neither continues anything nor is
      // continued into.
      line.trim() !== "" &&
      previous.trim() !== "" &&
      previousSourceLength >= wrapColumn &&
      !LIST_MARKER.test(line) &&
      !INTRODUCES_BLOCK.test(previous.trimEnd());

    if (continuesPrevious) {
      out[out.length - 1] = `${previous.trimEnd()} ${line.trim()}`;
    } else {
      out.push(line);
    }
    previousSourceLength = line.trimEnd().length;
  }

  return out.join("\n");
}
