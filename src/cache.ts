import {CachedItem} from "./cachedItem";
import {isValidCache} from "./isValidCache";

// TODO: add sizeLimit
export type CacherOptions = {
  /**
   max number of keys the cache holds
   */
  maxLength: number;

  /**
   time after which the cache is considered outdated
   */
  timeout: number;

  /**
   run a function on error
   this is a good option for logging when 'returnCacheEvenWhenError' is true
   */
  onError: (params:{ section: string, key: string, error: Error }) => void;


  /**
   delete key and value after timeout is reached
   */
  deleteOnTimeout: boolean;

  /**
   if possible, return an old cache even
   if an error occurred on the new cache
   */
  returnCacheEvenWhenError: boolean;

  /**
   avoid this when using aws lambda,
   when true, old cache is preferred vs waiting for the new cache.
   the old cache is returned and the new one is awaiting in the background.
   */
  returnOldCacheAndUpdate: boolean;
}

export const defaultCacherOptions:CacherOptions = {
  maxLength: 1024,
  timeout: 3600,
  onError: (params) => console.error(params),
  deleteOnTimeout: false,
  returnCacheEvenWhenError: false,
  returnOldCacheAndUpdate: false,
}

export class Cacher {
  private _cache: Record<string, CachedItem|undefined>;
  private _cacheList: CachedItem[];
  private options: CacherOptions;

  constructor(options: Partial<CacherOptions> = defaultCacherOptions) {
    this._cache = {};
    this._cacheList = [];
    this.options = {...defaultCacherOptions, ...options};
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
      // TODO: handle case when cache is undefined and prevent multiple calls
      const res = call().then(data => {
        this._add({
          LastModified: new Date(),
          key,
          data,
        });

        // TODO: implement
        if (this.options.deleteOnTimeout){}

        return data;
      });

      // WARNING: serverless functions will
      // not update cache in the background
      if (this.options.returnOldCacheAndUpdate && cached)
        return cached?.data as T;

      return await res as T;
    } catch (e) {
      this.options.onError({ section: 'getCachedAsync', key, error: e });
      if (this.options.returnCacheEvenWhenError && cached)
        return cached.data;
      throw e;
    }
  }
}
