import { ResourceClass } from './resourceClass';

export interface ResourceTarget {
  $resource: ResourceClass;
}

export interface ResourceBase {
  $storagePromise?: Promise<this>;
  $httpPromise?: Promise<this>;
  $formCache?: boolean;
}

export interface ResourceInstance extends ResourceBase {
  toJSON?(): {};
  $removed?: boolean;
}

export interface ResourceArray extends ResourceBase { }

export interface PendingAction {
  action: string;
  cacheParams: {};
  httpParams: {};
}

export interface NetworkStateAdapter {
  readonly isOnline: boolean;
  setOnlineHandler(handler: () => void): void;
  setOfflineHandler(handler: () => void): void;
}