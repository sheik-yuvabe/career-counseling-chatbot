import {
  GetProfileSnapshotService,
  PostgresProfileSnapshotReader,
  type AssessmentHttpDependencies,
} from "@yuvanext/assessment";
import {
  createSupabaseUserResolver,
  type SupabaseAuthClient,
} from "../auth/supabase-user-resolver.js";

type AssessmentDatabasePool = ConstructorParameters<typeof PostgresProfileSnapshotReader>[0];

export const createAssessmentRuntime = (
  databasePool: AssessmentDatabasePool,
  supabaseAuth: SupabaseAuthClient,
): Required<AssessmentHttpDependencies> => ({
  getProfileSnapshot: new GetProfileSnapshotService(
    new PostgresProfileSnapshotReader(databasePool),
  ),
  resolveUserId: createSupabaseUserResolver(supabaseAuth),
});
