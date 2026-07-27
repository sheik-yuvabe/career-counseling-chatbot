import { assessmentModule } from "@yuvanext/assessment";
import { counselorModule } from "@yuvanext/counselor";
import { evaluationModule } from "@yuvanext/evaluation";
import { knowledgeModule } from "@yuvanext/knowledge";
import { recommendationsModule } from "@yuvanext/recommendations";
import { safetyModule } from "@yuvanext/safety";
import type { ModuleDescriptor } from "@yuvanext/contracts";

export const modules: ModuleDescriptor[] = [
  assessmentModule,
  recommendationsModule,
  knowledgeModule,
  counselorModule,
  safetyModule,
  evaluationModule,
];
