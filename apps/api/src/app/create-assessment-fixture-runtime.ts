import { GetProfileSnapshotService, type AssessmentHttpDependencies } from "@yuvanext/assessment";
import { FixtureProfileReader } from "@yuvanext/counselor";
import { validProfileSnapshot } from "@yuvanext/test-fixtures";

export const createAssessmentFixtureRuntime = (
  bearerToken: string,
): Required<AssessmentHttpDependencies> => ({
  getProfileSnapshot: new GetProfileSnapshotService(
    new FixtureProfileReader([validProfileSnapshot]),
  ),
  resolveUserId: (request) => {
    const authorization = request.header("authorization");
    const match = authorization ? /^Bearer\s+(\S+)$/i.exec(authorization.trim()) : null;
    return Promise.resolve(match?.[1] === bearerToken ? validProfileSnapshot.userId : null);
  },
});
