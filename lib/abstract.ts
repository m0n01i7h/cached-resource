import { ResourceClass } from './resourceClass';

export interface ResourceTarget {
  $resource: ResourceClass;
  $compact: () => Promise<void>;
}

export interface ResourceBase {
  /**
   * Resolution of performing operations over the client side storage.
   */
  $storagePromise?: Promise<this>;
  /**
   * Resolution of performing operations over http.
   */
  $httpPromise?: Promise<this>;
  /**
   * Indicates whether the resource is from the client side storage.
   */
  $formCache?: boolean;
}

export interface ResourceInstance extends ResourceBase {
  toJSON?(): {};
  /**
   * Indicates whether the resource is newly created and not submitted to the server.
   */
  $new?: boolean;
  $query?: {};
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