import { ResourceClass } from './resourceClass';
import { ResourceMetadata } from './metadata';

/** @internal */
export interface ResourceTarget {
  $resource: ResourceClass;
  $compact: () => Promise<void>;
}

/**
 * Base interface for the resources.
 */
export interface ResourceBase {
  /**
   * Resolution of performing operations over the cache.
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
  /**
   * Produces regular JavaScript object or array from the resource.
   */
  toJSON?(): {};
}

/**
 * Single resource instance. Extend your model interfaces from this interface.
 */
export interface ResourceInstance extends ResourceBase {
  /**
   * Indicates whether the resource is newly created and not submitted to the server yet.
   */
  $new?: boolean;
  /**
   * @internal
   * Saves reference to itself if resource is new.
   */
  $query?: {};
  /**
   * Indicates whether the resource is removed.
   */
  $removed?: boolean;
}

/**
 * Array of the resources.
 */
export interface ResourceArray extends ResourceBase { }

/**
 * Used to determine network availability state.
 */
export interface NetworkStateAdapter {
  /**
   * Indicates whether internet connection is available.
   */
  readonly isOnline: boolean;
  /**
   * Set handler to be called once application get online.
   * @param {Function} handler Function to be called once application get online.
   */
  setOnlineHandler(handler: () => void): void;
  /**
   * Set handler to be called once application get offline.
   * @param {Function} handler Function to be called once application get offline.
   */
  setOfflineHandler(handler: () => void): void;
}

/** @internal */
export interface ResourceStatic {
  (config: ResourceMetadata): ClassDecorator;
  common?: ResourceMetadata;
}

/** @internal */
export interface PendingAction {
  action: string;
  cacheParams: {};
  httpParams: {};
}