import {CachedItem} from "./cachedItem";
import {isValidCache} from "./isValidCache";

export type CacherOptions = {
  maxLength: number;
  timeout: number;
}

export const defaultCacherOptions = {
  maxLength: 1024,
  timeout: 3600,
}

export class Cacher {
  private _cache: Record<string, CachedItem|undefined>;
  private _cacheList: CachedItem[];
  private options: CacherOptions;

  constructor(options: CacherOptions = defaultCacherOptions) {
    this._cache = {};
    this._cacheList = [];
    this.options = options;
  }

  _add = (item:CachedItem) => {
    if (!this._cache[item.key]) {
      if (this._cacheList.length >= this.options.maxLength) {
        console.warn(`cache hit maxLength ${this.options.maxLength}`);
        const lastItem = this._cacheList.pop();
        if (lastItem) {
          delete this._cache[lastItem.key];
        }
      }
      this._cacheList.push(item);
    }

    this._cache[item.key] = item;
  }

  _get = <T=any>(key:string):CachedItem<T>|undefined => {
    return this._cache[key];
  }

  get = async <T = any>(key: any, call: () => Promise<T>, timeout?:number): Promise<T> => {
    key = JSON.stringify(key);
    let cached = this._get<T>(key);

    // get cached data locally
    if (isValidCache(cached, timeout||this.options.timeout))
      return cached?.data as T;

    // update cache from database
    try {
      const data = await call();
      this._add({
        LastModified: new Date(),
        key,
        data,
      });
      return data as T
    } catch (e) {
      console.error({section: 'getCachedAsync', key, e});
      if (cached)
        return cached.data;
      throw e;
    }
  }
}
