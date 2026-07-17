import {
  createResourceArtifactInputSchema,
  RESOURCE_ARTIFACT_SCHEMA_VERSION,
  resourceArtifactSchema,
  resourceArtifactStoreSchema,
  type CreateResourceArtifactInput,
  type ResourceArtifact,
  type ResourceType,
} from "@/features/course-resources/resource-artifact-schema";

export const RESOURCE_ARTIFACT_STORAGE_KEY = "eduflow.resource-artifacts.v1";
export const MAX_RESOURCE_ARTIFACT_VERSIONS = 3;
export const MAX_RESOURCE_ARTIFACT_BYTES = 128 * 1024;
export const MAX_RESOURCE_ARTIFACT_STORE_BYTES = 4 * 1024 * 1024;

export class ResourceArtifactStorageError extends Error {
  constructor(message = "课程资源无法保存到当前设备") {
    super(message);
    this.name = "ResourceArtifactStorageError";
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createResourceId() {
  return globalThis.crypto.randomUUID();
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function readArtifacts(storage: Storage): ResourceArtifact[] {
  try {
    const raw = storage.getItem(RESOURCE_ARTIFACT_STORAGE_KEY);
    if (!raw) return [];
    const envelope = resourceArtifactStoreSchema.parse(JSON.parse(raw));
    return envelope.artifacts.flatMap((value) => {
      const parsed = resourceArtifactSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function writeArtifacts(storage: Storage, artifacts: ResourceArtifact[]) {
  const validated = artifacts.map((artifact) => resourceArtifactSchema.parse(artifact));
  for (const artifact of validated) {
    if (byteLength(JSON.stringify(artifact)) > MAX_RESOURCE_ARTIFACT_BYTES) {
      throw new ResourceArtifactStorageError("单个课程资源超过本地存储大小限制");
    }
  }

  const serialized = JSON.stringify({
    schemaVersion: RESOURCE_ARTIFACT_SCHEMA_VERSION,
    artifacts: validated,
  });
  if (byteLength(serialized) > MAX_RESOURCE_ARTIFACT_STORE_BYTES) {
    throw new ResourceArtifactStorageError("课程资源已达到当前设备的本地存储上限");
  }

  try {
    storage.setItem(RESOURCE_ARTIFACT_STORAGE_KEY, serialized);
  } catch (error) {
    throw new ResourceArtifactStorageError(
      error instanceof Error ? `课程资源保存失败：${error.message}` : undefined,
    );
  }
}

function hasSameIdentity(
  artifact: ResourceArtifact,
  identity: { courseProjectId: string; lessonId: string; resourceType: ResourceType },
) {
  return (
    artifact.courseProjectId === identity.courseProjectId &&
    artifact.lessonId === identity.lessonId &&
    artifact.resourceType === identity.resourceType
  );
}

export function listResourceArtifacts(storage: Storage, courseProjectId?: string) {
  return readArtifacts(storage)
    .filter((artifact) => !courseProjectId || artifact.courseProjectId === courseProjectId)
    .sort((left, right) => {
      const byDate = Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return byDate || right.version - left.version;
    });
}

export function getResourceArtifact(storage: Storage, resourceId: string) {
  return readArtifacts(storage).find((artifact) => artifact.resourceId === resourceId) ?? null;
}

export function listResourceArtifactVersions(
  storage: Storage,
  identity: { courseProjectId: string; lessonId: string; resourceType: ResourceType },
) {
  return readArtifacts(storage)
    .filter((artifact) => hasSameIdentity(artifact, identity))
    .sort((left, right) => right.version - left.version);
}

export function getReadyResourceArtifact(
  storage: Storage,
  identity: { courseProjectId: string; lessonId: string; resourceType: ResourceType },
) {
  return (
    listResourceArtifactVersions(storage, identity).find(
      (artifact) => artifact.status === "ready",
    ) ?? null
  );
}

export function createResourceArtifactVersion(
  storage: Storage,
  input: CreateResourceArtifactInput,
) {
  const parsedInput = createResourceArtifactInputSchema.parse(input);
  const identity = {
    courseProjectId: parsedInput.courseProjectId,
    lessonId: parsedInput.lessonId,
    resourceType: parsedInput.resourceType,
  };
  const artifacts = readArtifacts(storage);
  const previousVersions = artifacts
    .filter((artifact) => hasSameIdentity(artifact, identity))
    .sort((left, right) => right.version - left.version);
  const previous = previousVersions[0] ?? null;
  const timestamp = nowIso();
  const resourceId = createResourceId();

  const nextArtifact = resourceArtifactSchema.parse({
    ...parsedInput,
    schemaVersion: RESOURCE_ARTIFACT_SCHEMA_VERSION,
    resourceId,
    status: "ready",
    version: (previous?.version ?? 0) + 1,
    replacesResourceId: previous?.resourceId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const updatedArtifacts = artifacts.map((artifact) =>
    hasSameIdentity(artifact, identity) && artifact.status === "ready"
      ? resourceArtifactSchema.parse({
          ...artifact,
          status: "superseded",
          updatedAt: timestamp,
        })
      : artifact,
  );
  updatedArtifacts.push(nextArtifact);

  const retainedResourceIds = new Set(
    updatedArtifacts
      .filter((artifact) => hasSameIdentity(artifact, identity))
      .sort((left, right) => right.version - left.version)
      .slice(0, MAX_RESOURCE_ARTIFACT_VERSIONS)
      .map((artifact) => artifact.resourceId),
  );
  const prunedArtifacts = updatedArtifacts.filter(
    (artifact) => !hasSameIdentity(artifact, identity) || retainedResourceIds.has(artifact.resourceId),
  );

  writeArtifacts(storage, prunedArtifacts);
  return nextArtifact;
}
