export type CachedItem<T=any> = {
  key: string;
  LastModified: Date;
  data: T;
  call?: Promise<T>;
};