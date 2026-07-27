import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const IsoTimestampSchema = z.string().datetime({ offset: true });

export const SegmentSchema = z.enum(["explorer", "pathfinder", "launcher"]);
export type Segment = z.infer<typeof SegmentSchema>;

// A full user-supplied state/UT value. Canonical lookup is a separate concern.
export const StateSchema = z.string().trim().min(1).max(120);
export type State = z.infer<typeof StateSchema>;

export const ModuleDescriptorSchema = z.object({
  code: z.enum(["m1", "m2", "m3", "m4", "m5-evaluation", "m5-safety"]),
  name: z.string().min(1),
  packageName: z.string().startsWith("@yuvanext/"),
  status: z.enum(["scaffolded", "in_progress", "ready"]),
});
export type ModuleDescriptor = z.infer<typeof ModuleDescriptorSchema>;
