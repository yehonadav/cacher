import {isCacheExpired} from "./isCacheExpired";
import {CachedItem} from "./cachedItem";

export const isValidCache = (item: CachedItem|undefined, timeout: number) =>
  item?.data && !isCacheExpired(item as CachedItem, timeout);