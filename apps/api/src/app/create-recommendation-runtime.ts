import {
  GetRecommendationSetService,
  PostgresRecommendationSetReader,
  type RecommendationHttpDependencies,
} from "@yuvanext/recommendations";
import {
  createSupabaseUserResolver,
  type SupabaseAuthClient,
} from "../auth/supabase-user-resolver.js";

type RecommendationDatabasePool = ConstructorParameters<typeof PostgresRecommendationSetReader>[0];

export const createRecommendationRuntime = (
  databasePool: RecommendationDatabasePool,
  supabaseAuth: SupabaseAuthClient,
): Required<RecommendationHttpDependencies> => ({
  getRecommendationSet: new GetRecommendationSetService(
    new PostgresRecommendationSetReader(databasePool),
  ),
  resolveUserId: createSupabaseUserResolver(supabaseAuth),
});
