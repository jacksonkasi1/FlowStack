// ** import core packages
import { nanoid } from "nanoid";

export function newId(): string {
  return nanoid();
}

export function newPrefixedId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}
