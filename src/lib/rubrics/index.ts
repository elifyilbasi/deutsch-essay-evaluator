import type { Institute, Level } from "@/generated/prisma/client";
import type { InstituteRubrics, LevelRubric } from "./types";
import { telcRubrics } from "./telc";

const rubrics: InstituteRubrics = {
  TELC: telcRubrics,
  // GOETHE added in a later phase - see plan.
};

export function getRubric(institute: Institute, level: Level): LevelRubric | undefined {
  return rubrics[institute]?.[level];
}

export { telcRubrics };
export { maxRawScore, scoreFromBands } from "./types";
export type {
  LevelRubric,
  CriterionDefinition,
  Band,
  BandLetter,
  ScoreBreakdown,
} from "./types";
