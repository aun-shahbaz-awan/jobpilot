import type { SourceId } from "../settings";
import { arbeitnow, himalayas, jobicy, remoteok, remotive } from "./boards";
import { ashby, greenhouse, lever } from "./companies";
import type { Source } from "./types";

export const SOURCES: Source[] = [remotive, remoteok, himalayas, jobicy, arbeitnow, greenhouse, lever, ashby];
export const SOURCE_BY_ID = new Map<SourceId, Source>(SOURCES.map((s) => [s.id, s]));
export type { RawJob, Source } from "./types";
