import type { Entity } from "@/types";

type EntityAttributes = NonNullable<Entity["attributes"]>;

/** Read roles from attributes, including legacy `current_role`. */
export function readRoles(attributes?: EntityAttributes): string[] {
  const fromArray = attributes?.roles?.map((r) => r.trim()).filter(Boolean);
  if (fromArray?.length) return fromArray;
  const legacy = attributes?.current_role?.trim();
  return legacy ? [legacy] : [];
}

/** Read organization entity ids, including legacy singular field. */
export function readOrganizationIds(attributes?: EntityAttributes): string[] {
  const fromArray = attributes?.current_organization_entity_ids?.filter(Boolean);
  if (fromArray?.length) return [...fromArray];
  const legacy = attributes?.current_organization_entity_id?.trim();
  return legacy ? [legacy] : [];
}

/** Trim, drop empties; returns undefined when nothing remains. */
export function writeStringList(values: string[]): string[] | undefined {
  const trimmed = values.map((v) => v.trim()).filter(Boolean);
  return trimmed.length ? trimmed : undefined;
}

/** Like writeStringList but preserves first-seen order and drops duplicate ids. */
export function writeOrganizationIds(ids: string[]): string[] | undefined {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique.length ? unique : undefined;
}
