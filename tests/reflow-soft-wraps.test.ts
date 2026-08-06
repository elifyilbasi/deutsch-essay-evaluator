import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { reflowSoftWraps } from "@/lib/reflowSoftWraps";

/**
 * The exam texts are hard-wrapped in the seed files, and only some of those newlines
 * are meant to be seen. The cases that matter are the ones where a rule reading
 * punctuation or capitalisation would get it wrong, and the ones where dropping a break
 * loses something the candidate needs: a bullet list, an address, the a)/b) choice.
 */

describe("reflowSoftWraps", () => {
  it("joins a paragraph wrapped mid-sentence", () => {
    const input = [
      "Überall hört und liest man von verschiedenen Ernährungstrends: vegetarisch,",
      "vegan, Ernährung ohne Milchprodukte oder ohne Zucker — aber was ist wirklich",
      "gut für Sie?",
    ].join("\n");

    assert.equal(
      reflowSoftWraps(input),
      "Überall hört und liest man von verschiedenen Ernährungstrends: vegetarisch, " +
        "vegan, Ernährung ohne Milchprodukte oder ohne Zucker — aber was ist wirklich " +
        "gut für Sie?",
    );
  });

  it("joins a wrapped line whose continuation starts with a capital", () => {
    // German capitalises nouns, so "als" / "Ernährungsberater" is indistinguishable
    // from a deliberate break by case alone.
    const input =
      "Alle Kursleiterinnen und Kursleiter sind seit vielen Jahren als\nErnährungsberater tätig.";
    assert.equal(
      reflowSoftWraps(input),
      "Alle Kursleiterinnen und Kursleiter sind seit vielen Jahren als Ernährungsberater tätig.",
    );
  });

  it("joins a wrapped line that happens to end in a full stop", () => {
    // Punctuation cannot mark the end of a paragraph either: a wrap lands wherever the
    // margin falls, including just after a sentence that continues below.
    const input =
      "In unseren Kursen beantworten wir Ihre Fragen zum Thema Ernährung.\nAußerdem erfahren Sie mehr.";
    assert.equal(
      reflowSoftWraps(input),
      "In unseren Kursen beantworten wir Ihre Fragen zum Thema Ernährung. Außerdem erfahren Sie mehr.",
    );
  });

  it("keeps paragraph breaks", () => {
    const input = `${"a".repeat(70)}\n\n${"b".repeat(70)}`;
    assert.equal(reflowSoftWraps(input), input);
  });

  it("keeps an address block, whose lines are short", () => {
    const input = [
      "Institut für bewusste Ernährung e. V.",
      "Jahnstraße 120",
      "70173 Stuttgart",
      "info@ibe-stuttgart.de",
    ].join("\n");
    assert.equal(reflowSoftWraps(input), input);
  });

  it("keeps a bullet on its own line after a full-width line", () => {
    const input =
      "Flug oder Bahnfahrt, Abfahrt in vielen deutschen Städten sowie Transfer\n• Unterbringung in Jugendherbergen";
    assert.equal(reflowSoftWraps(input), input);
  });

  it("keeps the a)/b) options of the telc Aufgabe apart", () => {
    const input = [
      "Behandeln Sie entweder",
      "a) mindestens drei der folgenden Punkte",
      "oder",
      "b) mindestens zwei der folgenden Punkte und einen weiteren Aspekt Ihrer Wahl.",
    ].join("\n");
    assert.equal(reflowSoftWraps(input), input);
  });

  it("does not pull a list up onto the line that introduces it", () => {
    const input =
      "Trainiere eine Woche gratis und entscheide dich dann für eines unserer Angebote:\n12 Monate 6,99 €";
    assert.equal(reflowSoftWraps(input), input);
  });

  it("does not pull a short closing line into the paragraph above it", () => {
    // No blank line between them, so only the length rule keeps them apart.
    const input = `${"Wir freuen uns auf Ihre Nachricht und stehen Ihnen gern zur Verfügung.".padEnd(70, ".")}\nkurz.\nHerzliche Grüße`;
    const out = reflowSoftWraps(input).split("\n");
    assert.equal(out.length, 2, "the short line must not keep absorbing what follows");
    assert.equal(out[1], "Herzliche Grüße");
  });

  it("leaves text that is already reflowed untouched", () => {
    const input = "Eine einzelne lange Zeile, die schon zusammenhängt und nichts verliert.";
    assert.equal(reflowSoftWraps(input), input);
  });

  it("preserves every bullet across the whole seed bank", () => {
    // The regression that matters at scale: a rule change that starts eating list items
    // would be invisible in any single fixture.
    const dir = path.join(process.cwd(), "prisma");
    let checked = 0;
    for (const file of fs.readdirSync(dir).filter((f) => f.startsWith("seed"))) {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      const re = /(?:stimulusText|instructions):\s*(?:aufgabe\(\s*)?`([\s\S]*?)`/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const before = (m[1].match(/^\s*[•▪]/gm) || []).length;
        const after = (reflowSoftWraps(m[1]).match(/^\s*[•▪]/gm) || []).length;
        assert.equal(after, before, `bullets lost in ${file}`);
        checked++;
      }
    }
    assert.ok(checked > 50, `expected the whole bank, only saw ${checked} blocks`);
  });
});
