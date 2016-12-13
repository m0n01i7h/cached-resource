import { ResourceClass } from './resource';

export interface ResourceTarget {
  $resource: ResourceClass;
}

export interface ResourceBase {
  $storagePromise?: Promise<this>;
  $httpPromise?: Promise<this>;
  $formCache?: boolean;
}

export interface ResourceInstance extends ResourceBase {
  toObject?(): {};
  $removed?: boolean;
}

export interface ResourceArray extends ResourceBase { }

export interface PendingAction {
  action: string;
  cacheParams: {};
  httpParams: {};
}