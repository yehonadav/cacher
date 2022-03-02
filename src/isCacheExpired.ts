import {CachedItem} from "./cachedItem";

export const isCacheExpired = (cachedItem: CachedItem, timeout: number) =>
  cachedItem.LastModified.getTime() + timeout < Date.now();