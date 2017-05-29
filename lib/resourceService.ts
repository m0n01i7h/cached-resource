import * as axios from 'axios';
import { AxiosResponse } from 'axios';
import * as UrlPattern from 'url-pattern';
import * as _ from 'lodash';
import * as localforage from 'localforage';
import * as qs from 'qs';

import { ActionMetadata, ResourceMetadata } from './metadata';
import {
  getActionKey,
  getArrayKey,
  getInstanceKey,
  getParams,
  getRandomParams,
  getUrl,
  defer
} from './utils';

import {
  ResourceBase,
  ResourceInstance,
  ResourceArray,
  PendingAction
} from './abstract';

import { Resource, ResourceList } from './resourceModels';

import { SyncLock } from './lock';
import { Cache } from './cache';
import { ActionsScheduler } from './scheduler';

/** @internal */
export class ResourceService {

  private actions: { [key: string]: ActionMetadata } = {};
  private config: ResourceMetadata;
  private storage: LocalForage;
  private cache: Cache;
  private scheduler: ActionsScheduler;
  private sync = new SyncLock();
  private ready = defer();

  /**
   * Initialize resource
   */
  public async init(config: ResourceMetadata) {
    this.config = config;

    if (config.bootstrap) {
      await config.bootstrap;
    }

    // do not init cache and scheduler for httpOnly
    if (!this.config.httpOnly) {
      this.storage = localforage.createInstance({
        name: this.config.name,
        storeName: 'keyvaluepairs',
        version: 1,
        driver: this.config.driver
      });

      await this.storage.ready();
      this.cache = new Cache(this.sync, this.config, this.storage);
      this.scheduler = new ActionsScheduler(this.storage, this.config, this, this.cache);
    }

    this.ready.resolve();
  }

  /**
   * Add resource action.
   * @param {string} name Name of the action.
   * @param {ActionMetadata} config Config of the action.
   */
  public addAction(name: string, config: ActionMetadata): Function {
    this.actions[name] = config;
    return (params, body, config) => this.invoke(name, params, body, config);
  }

  /**
   * Invoke resource action.
   * @param {string} action Name of the action.
   * @param {Object} params Request params.
   * @param {Object|Resource} body Request payload.
   * @param {ActionMetadata} [config] Overrides of action config.
   * @return {Resource} Created resource.
   */
  public invoke(action: string, params: {} = {}, body: Object | Resource = {}, config?: ActionMetadata): ResourceBase {
    const actionConfig = _.assign({}, this.actions[action], config || {}) as ActionMetadata;
    const url = getUrl(
      actionConfig.url || this.config.url,
      _.assign({}, this.config.params || {}, actionConfig.params || {}, params),
      body
    );

    const resource: ResourceList | Resource = actionConfig.isArray
      ? new ResourceList()
      : body instanceof Resource ? body : new Resource(body)
      ;

    if (!this.config.httpOnly && actionConfig.localOnly) {
      resource.$httpPromise = Promise.reject<ResourceBase>(new Error('This action is localOnly'));
    }

    if (this.config.httpOnly || actionConfig.httpOnly) {
      resource.$storagePromise = Promise.reject<ResourceBase>(new Error('This action is httpOnly'));
    }

    if (actionConfig.method === 'get') {
      return this.invokeGetAction(url, params, actionConfig, resource);
    }

    if (actionConfig.method === 'post') {
      return this.invokePostAction(action, url, params, actionConfig, resource);
    }

    if (actionConfig.method === 'put') {
      return this.invokePutAction(action, url, params, actionConfig, resource);
    }

    if (actionConfig.method === 'delete') {
      return this.invokeDeleteAction(action, url, params, actionConfig, resource);
    }

    return resource;
  }

  /**
   * Compact cache. Removes all the abandoned instances.
   * Process is similar to garbage collection. Do not recommended to use autocompaction on large resources.
   * @return {Promise<void>}
   */
  public async compact() {
    return this.cache.compact();
  }

  /**
   * Clear cache and remove all pending actions.
   * @return {Promise<void>}
   */
  public async clear() {
    await Promise.all([this.cache.clear(), this.scheduler.clear()]);
  }

  /** @internal */
  private invokeGetAction(url: string, params: {} = {}, actionConfig: ActionMetadata, resource: Resource | ResourceList) {

    if (this.config.httpOnly || !actionConfig.localOnly) {
      resource.$httpPromise = this.ready.promise
        .then(() => this.config.networkState.isOnline
          // Perform request if online
          ? this.config.http.get(url, actionConfig.config)
            .then(res => this.handleResponse(params, actionConfig, res.data, resource) as any)
          // Otherwise create pending action
          : Promise.reject<any>(new Error('Offline'))
        );
    }

    if (!this.config.httpOnly && actionConfig.httpOnly) {
      resource.$storagePromise = this.ready.promise
        .then<any>(() => actionConfig.isArray
          ? this.cache.findAll(params, resource as ResourceList)
          : this.cache.findOne(params, resource as Resource)
        );
    }

    return resource;
  }

  /** @internal */
  private invokePostAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceInstance) {
    const cacheParams = getRandomParams(_.assign({}, this.config.params, params), resource);
    const httpParams = getParams(_.assign({}, this.config.params, params), resource);

    // Resource is new one
    if (!_.isEqual(getParams(_.assign({}, this.config.params, params), resource), cacheParams)) {
      resource.$new = true;
      resource.$query = cacheParams;
    }

    if (this.config.httpOnly || !actionConfig.localOnly) {
      resource.$httpPromise = this.ready.promise
        .then(() => this.config.networkState.isOnline
          // Perform request if online
          ? this.config.http.post(url, new Resource(resource).toRequestBody(), actionConfig.config)
            .then(async (res) => {
              delete resource.$new;
              delete resource.$query;

              await this.handleResponse(params, actionConfig, res.data, resource as Resource);

              // Do not remove instance if resource was not a new one.
              if (_.isEqual(getParams(_.assign({}, this.config.params, params), resource), cacheParams)) {
                return;
              }

              await this.cache.replaceInArray(httpParams, cacheParams, resource as Resource);
              await this.cache.remove(cacheParams);
            })
            .catch(err => this.enqueueAction(action, err, actionConfig, cacheParams, httpParams))
          // Otherwise create pending action
          : this.enqueueAction(action, new Error('Offline') as any, actionConfig, cacheParams, httpParams)
        )
        .then(() => resource);
    }

    if (!this.config.httpOnly && !actionConfig.httpOnly) {
      resource.$storagePromise = this.ready.promise
        .then(() => this.cache.saveOne(httpParams, cacheParams, resource));
    }

    return resource;
  }

  /** @internal */
  private invokePutAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    const cacheParams = getRandomParams(_.assign({}, this.config.params, params), resource);
    const httpParams = getParams(_.assign({}, this.config.params, params), resource);

    if (this.config.httpOnly || !actionConfig.localOnly) {
      resource.$httpPromise = this.ready.promise
        .then(() => this.config.networkState.isOnline
          // Perform request if online
          ? this.config.http.put(url, new Resource(resource).toRequestBody(), actionConfig.config)
            .then(res => this.handleResponse(params, actionConfig, res.data, resource as Resource) as any)
            .catch(err => this.enqueueAction(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
          // Otherwise create pending action
          : this.enqueueAction(action, new Error('Offline') as any, actionConfig, cacheParams, httpParams) as Promise<any>
        );
    }

    if (!this.config.httpOnly && !actionConfig.httpOnly) {
      resource.$storagePromise = this.ready.promise
        .then(() => this.cache.saveOne(httpParams, cacheParams, resource));
    }

    return resource;
  }

  /** @internal */
  private invokeDeleteAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceInstance = {}) {
    const cacheParams = getParams(this.config.params, resource);
    const httpParams = getParams(_.assign({}, this.config.params, params), resource);

    if (!this.config.httpOnly && (resource.$new || actionConfig.localOnly)) {
      resource.$httpPromise = this.ready.promise
        .then(() => Promise.all([
          this.cache.remove(resource.$query || cacheParams),
          this.scheduler.removeAction(resource.$query || cacheParams),
          this.cache.removeFromArrays([resource.$query || cacheParams])
        ]));
    } else {
      resource.$httpPromise = this.ready.promise
        .then(() => this.config.networkState.isOnline
          // Perform request if online
          ? this.config.http.delete(url, actionConfig.config)
            .then(async (res) => {
              _.assign(resource, { $removed: true });

              if (!this.config.httpOnly && !actionConfig.httpOnly) {
                await this.cache.removeFromArrays([resource.$query || cacheParams]);
                await this.cache.remove(cacheParams);
              }

              return resource;
            })
            .catch(err => this.enqueueAction(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
          // Otherwise create pending action
          : this.enqueueAction(action, new Error('Offline') as any, actionConfig, cacheParams, httpParams) as Promise<any>
        );
    }

    if (!this.config.httpOnly && !actionConfig.httpOnly) {
      resource.$storagePromise = this.ready.promise
        .then(() => this.cache.removeFromArrays([resource.$query || cacheParams]))
        .then(() => resource);
    }

    return resource;
  }

  /**
   * @internal
   * Handle response
   */
  private async handleResponse(httpParams: {}, config: ActionMetadata, data: {} | Array<{}>, resource: Resource | ResourceList) {

    if (config.isArray && !_.isArray(data)) {
      throw new Error(`Resource expected an array but got ${typeof data}`);
    }

    if (config.isArray) {
      this.handleArrayResponse(httpParams, config, data as Array<{}>, resource as ResourceList);
    } else {
      this.handleInstanceResponse(httpParams, config, data, resource as Resource);
    }

    delete resource.$httpPromise;

    return resource;
  }

  /** @internal */
  private async handleArrayResponse(httpParams: {}, config: ActionMetadata, data: Array<{}>, resource: ResourceList) {

    for (let entry of data) {
      _.assign(entry, { $fromCache: false });

      let instance = _.find(resource, getParams(this.config.params, entry));

      if (instance) {
        _.assign(instance, entry);
      } else {
        resource.push(new Resource(entry));
      }
    }

    if (!this.config.httpOnly && !config.httpOnly) {
      await this.cache.saveAll(httpParams, resource);
    }

    const temp = [].concat(resource);

    // clear resource array but save the reference to it
    resource.splice(0);

    // add elements to resource according in save order as responded array
    for (let entry of data as Array<{}>) {
      const element = _.find(temp, getParams(this.config.params, entry));
      resource.push(element);
    }

    // indicate resource has server origin
    _.assign(resource, { $fromCache: false });

    if (!this.config.httpOnly && !config.httpOnly && this.config.autoCompact) {
      await this.compact();
    }

    return resource;
  }

  /** @internal */
  private async handleInstanceResponse(httpParams: {}, config: ActionMetadata, data: {}, resource: Resource) {
    _.assign(resource, data, { $fromCache: false });
    const cacheParams = getParams(this.config.params, resource);

    if (this.config.httpOnly || config.httpOnly) {
      return resource;
    }

    this.cache.saveOne(httpParams, cacheParams, resource);
  }

  /** @internal */
  private async enqueueAction(action: string, err: AxiosResponse, actionConfig: ActionMetadata, cacheParams: {}, httpParams: {}) {

    // skip adding pending action for httpOnly actions
    if (this.config.httpOnly || actionConfig.httpOnly) {
      throw err;
    }

    // save pending action if request was valid
    if (!err.status || err.status < 400 || err.status > 499) {
      await this.scheduler.addAction(cacheParams, {
        action: action,
        httpParams: httpParams,
        cacheParams: cacheParams
      } as PendingAction);
    }

    // rethrow rejection
    throw err;
  }
}