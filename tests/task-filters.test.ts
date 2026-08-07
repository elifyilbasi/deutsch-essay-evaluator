import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFacets,
  filterTasks,
  foldGerman,
  hasActiveFilters,
  toggleFacetValue,
  type TaskLike,
} from "@/lib/taskFilters";

function task(over: Partial<TaskLike> = {}): TaskLike {
  return {
    title: "Beschwerde über einen Sprachkurs",
    taskIntro: "In einer Zeitschrift haben Sie folgende Anzeige gelesen:",
    leitpunkte: ["Grund Ihres Schreibens", "Was Sie erwartet hatten"],
    register: "SIE",
    schreibanlass: "BESCHWERDE",
    practice: null,
    ...over,
  };
}

/** n tasks alike but for the fields given, so a bank's shape is one line to state. */
function bank(n: number, over: Partial<TaskLike> = {}): TaskLike[] {
  return Array.from({ length: n }, (_, i) => task({ title: `Aufgabe ${i}`, ...over }));
}

describe("buildFacets", () => {
  it("returns nothing for a bank whose tasks are all alike (the B1 case)", () => {
    // All twenty B1 tasks are an informal reply, so not one of the three axes can
    // divide them and the toolbar should offer no chips at all.
    assert.deepEqual(buildFacets(bank(20, { schreibanlass: "ANTWORT", register: "DU" })), []);
  });

  it("offers an Anlass facet where the Anlass varies (the B2 case)", () => {
    const tasks = [
      ...bank(23, { schreibanlass: "BESCHWERDE" }),
      ...bank(9, { schreibanlass: "ANFRAGE" }),
      ...bank(6, { schreibanlass: "BEWERBUNG" }),
      ...bank(1, { schreibanlass: "ANGEBOT" }),
    ];
    const facets = buildFacets(tasks);

    assert.deepEqual(
      facets.map((f) => f.key),
      ["anlass"],
      "register is uniform at B2, so it must not appear",
    );
    assert.deepEqual(facets[0].options, [
      { value: "BESCHWERDE", label: "Beschwerde", count: 23 },
      { value: "ANFRAGE", label: "Anfrage", count: 9 },
      { value: "BEWERBUNG", label: "Bewerbung", count: 6 },
      { value: "ANGEBOT", label: "Angebot", count: 1 },
    ]);
  });

  it("offers a Register facet where the register varies (the A2 case)", () => {
    const tasks = [
      ...bank(9, { register: "SIE", schreibanlass: "MITTEILUNG" }),
      ...bank(3, { register: "DU", schreibanlass: "ANTWORT" }),
    ];
    assert.deepEqual(
      buildFacets(tasks).map((f) => f.key),
      ["anlass", "register"],
    );
  });

  it("ignores a lone outlier rather than building a facet around it", () => {
    // B1's twenty are all informal but for the single formal reply to a Sprachschule.
    // A chip whose only job is to isolate one task is not a way to narrow a list.
    const tasks = [...bank(19, { register: "DU" }), ...bank(1, { register: "SIE" })];
    assert.deepEqual(
      buildFacets(tasks).filter((f) => f.key === "register"),
      [],
    );
  });

  it("lists a singleton once the facet exists on its own merits", () => {
    // ANGEBOT covers one task, but BESCHWERDE and ANFRAGE already earned the facet, so
    // hiding it would leave that task reachable only by clearing the filter.
    const tasks = [
      ...bank(5, { schreibanlass: "BESCHWERDE" }),
      ...bank(4, { schreibanlass: "ANFRAGE" }),
      ...bank(1, { schreibanlass: "ANGEBOT" }),
    ];
    const anlass = buildFacets(tasks).find((f) => f.key === "anlass");
    assert.ok(anlass);
    assert.equal(anlass.options.length, 3);
    assert.equal(anlass.options.at(-1)!.count, 1);
  });

  it("offers the practice facet only once some but not all are practised", () => {
    const practised = { attemptCount: 1, bestScore: 10, maxScore: 15 };
    const keys = (tasks: TaskLike[]) => buildFacets(tasks).map((f) => f.key);

    assert.ok(!keys(bank(12)).includes("practice"), "none practised");
    assert.ok(!keys(bank(12, { practice: practised })).includes("practice"), "all practised");
    assert.ok(
      keys([...bank(8), ...bank(4, { practice: practised })]).includes("practice"),
      "a mix",
    );
  });
});

describe("foldGerman", () => {
  it("folds the diacritics a non-German keyboard will not produce", () => {
    assert.equal(foldGerman("Beschwerde über Grüße"), "beschwerde uber grusse");
  });

  it("folds ß to ss rather than dropping it", () => {
    assert.equal(foldGerman("Straße"), "strasse");
  });
});

describe("filterTasks", () => {
  const tasks = [
    task({ title: "Beschwerde über einen Sprachkurs", schreibanlass: "BESCHWERDE" }),
    task({ title: "Bewerbung um ein Praktikum im Umweltzentrum", schreibanlass: "BEWERBUNG" }),
    task({ title: "Anfrage zu einer Ferienwohnung", schreibanlass: "ANFRAGE", register: "DU" }),
  ];

  it("matches a query against the folded title", () => {
    assert.deepEqual(
      filterTasks(tasks, "uber", {}).map((t) => t.schreibanlass),
      ["BESCHWERDE"],
    );
  });

  it("requires every term, so two words pin down what neither does alone", () => {
    assert.equal(filterTasks(tasks, "praktikum umwelt", {}).length, 1);
    assert.equal(filterTasks(tasks, "praktikum ferienwohnung", {}).length, 0);
  });

  it("matches inside a compound", () => {
    assert.equal(filterTasks(tasks, "kurs", {}).length, 1, "Sprachkurs");
  });

  it("searches the Leitpunkte, not only the title", () => {
    const withPoint = task({ title: "Etwas anderes", leitpunkte: ["Ihre Zimmerwünsche"] });
    assert.equal(filterTasks([withPoint], "zimmerwunsche", {}).length, 1);
  });

  it("ORs within one facet and ANDs across two", () => {
    assert.equal(
      filterTasks(tasks, "", { anlass: ["BESCHWERDE", "ANFRAGE"] }).length,
      2,
      "two chips in one facet widen the list",
    );
    assert.equal(
      filterTasks(tasks, "", { anlass: ["BESCHWERDE", "ANFRAGE"], register: ["DU"] }).length,
      1,
      "a chip in a second facet narrows it",
    );
  });

  it("treats an empty facet as no filter at all", () => {
    assert.equal(filterTasks(tasks, "", { anlass: [] }).length, tasks.length);
  });

  it("applies the query and the chips together", () => {
    assert.equal(filterTasks(tasks, "anfrage", { anlass: ["BESCHWERDE"] }).length, 0);
  });
});

describe("hasActiveFilters", () => {
  it("ignores whitespace and empty facets", () => {
    assert.equal(hasActiveFilters("   ", { anlass: [] }), false);
    assert.equal(hasActiveFilters("a", {}), true);
    assert.equal(hasActiveFilters("", { anlass: ["ANFRAGE"] }), true);
  });
});

describe("toggleFacetValue", () => {
  it("adds, removes, and leaves the other facets alone", () => {
    const one = toggleFacetValue({ register: ["DU"] }, "anlass", "ANFRAGE");
    assert.deepEqual(one, { register: ["DU"], anlass: ["ANFRAGE"] });
    assert.deepEqual(toggleFacetValue(one, "anlass", "ANFRAGE"), {
      register: ["DU"],
      anlass: [],
    });
  });
});
