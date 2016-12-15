import * as axios from 'axios';
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
  getUrl
} from './utils';

import {
  ResourceBase,
  PendingAction
} from './abstract';

import { Resource, ResourceList } from './resource';

import { SyncLock } from './lock';
import { Cache } from './cache';

export class ResourceClass {

  private actions: { [key: string]: ActionMetadata } = {};
  private config: ResourceMetadata;
  private storage: LocalForage;
  private cache: Cache;
  private sync = new SyncLock();

  public async init(config: ResourceMetadata) {
    this.config = config;
    this.storage = localforage.createInstance({
      name: config.name,
      storeName: 'keyvaluepairs',
      version: '1.0',
      driver: config.driver
    });

    this.cache = new Cache(this.sync, this.config, this.storage);

    try {
      await this.checkPendingActions();
    } catch (err) {
      console.warn(err);
    }
  }

  public addAction(name: string, config: ActionMetadata): Function {
    this.actions[name] = config;
    return (params, body, config) => this.invoke(name, params, body, config);
  }

  private invoke(action: string, params: {} = {}, body: {} = {}, config?: ActionMetadata): ResourceBase {
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

    if (actionConfig.localOnly) {
      resource.$httpPromise = Promise.reject<ResourceBase>(new Error('This action is localOnly'));
    }

    if (actionConfig.httpOnly) {
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

  private invokeGetAction(url: string, params: {} = {}, actionConfig: ActionMetadata, resource: Resource | ResourceList) {

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.get(url)
        .then(res => this.handleResponse(params, actionConfig, res.data, resource) as any)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = (actionConfig.isArray
        ? this.cache.findAll(params, resource as ResourceList)
        : this.cache.findOne(params, resource as Resource))
        ;
    }

    return resource;
  }

  private invokePostAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    const cacheParams = getRandomParams(_.assign({}, this.config.params, params), resource);
    const httpParams = getParams(_.assign({}, this.config.params, params), resource);

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.post(url, new Resource(resource).toRequestBody())
        .then(async (res) => {
          await this.handleResponse(params, actionConfig, res.data, resource as Resource);
          // Do not remove instance if params was not a random one.
          if (_.isEqual(getParams(_.assign({}, this.config.params, params), resource), cacheParams)) {
            console.log(getParams(_.assign({}, this.config.params, params), resource), cacheParams, 'are equal. Skip removing from array');
            return;
          }
          await this.cache.replaceInArray(httpParams, cacheParams, resource as Resource);
          await this.cache.remove(cacheParams);
        })
        .catch(err => this.handleResponseError(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = this.cache.saveOne(httpParams, cacheParams, resource);
    }

    return resource;
  }

  private invokePutAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    const cacheParams = getRandomParams(_.assign({}, this.config.params, params), resource);
    const httpParams = getParams(_.assign({}, this.config.params, params), resource);

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.put(url, new Resource(resource).toRequestBody())
        .then(res => this.handleResponse(params, actionConfig, res.data, resource as Resource) as any)
        .catch(err => this.handleResponseError(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = this.cache.saveOne(httpParams, cacheParams, resource);
    }

    return resource;
  }

  private invokeDeleteAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    const cacheParams = getParams(this.config.params, resource);
    const httpParams = getParams(_.assign({}, this.config.params, params), resource);

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.delete(url)
        .then(async (res) => {
          await this.cache.removeFromArrays([cacheParams]);
          await this.cache.remove(cacheParams);
          _.assign(resource, { $removed: true });
          return resource;
        })
        .catch(err => this.handleResponseError(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = this.cache.removeFromArrays([resource])
        .then(() => resource);
    }

    return resource;
  }

  /**
   * Handle response
   */
  private handleResponse(httpParams: {}, config: ActionMetadata, data: {} | Array<{}>, resource: Resource | ResourceList) {

    if (config.isArray && !_.isArray(data)) {
      throw new Error(`Resource expected an array but got ${typeof data}`);
    }

    if (config.isArray) {
      return this.handleArrayResponse(httpParams, config, data as Array<{}>, resource as ResourceList);
    }

    delete resource.$httpPromise;

    return this.handleInstanceResponse(httpParams, config, data, resource as Resource);
  }

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

    if (!config.httpOnly) {
      this.cache.saveAll(httpParams, resource);
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

    return resource;
  }

  private async handleInstanceResponse(httpParams: {}, config: ActionMetadata, data: {}, resource: Resource) {
    _.assign(resource, data, { $fromCache: false });
    const cacheParams = getParams(this.config.params, resource);

    return config.httpOnly ? resource : this.cache.saveOne(httpParams, cacheParams, resource);
  }

  private async handleResponseError(action: string, err: Axios.AxiosXHR<any>, actionConfig: ActionMetadata, cacheParams: {}, httpParams: {}) {

    // skip adding pending action for httpOnly actions
    if (actionConfig.httpOnly) {
      throw err;
    }

    // save pending action if request was valid
    if (!err.status || err.status < 400 || err.status > 499) {
      await this.storage.setItem(
        getActionKey(cacheParams),
        {
          action: action,
          httpParams: httpParams,
          cacheParams: cacheParams
        } as PendingAction
      );
    }

    // rethrow rejection
    throw err;
  }

  private async checkPendingActions() {
    const actionKeys = _(await this.storage.keys()).filter(key => /^action/.test(key)).value();
    const deleted = [];

    const actions = actionKeys.map(async (actionKey: string) => {
      const action = await this.storage.getItem<PendingAction>(actionKey);
      const instanceKey = getInstanceKey(this.config, action.cacheParams);
      const instance = await this.storage.getItem(instanceKey);

      if (!instance) {
        return await this.storage.removeItem(actionKey);
      }

      const resource = await this.invoke(action.action, action.httpParams, instance, { httpOnly: true } as ActionMetadata);
      resource.$storagePromise.catch(() => { });

      await resource.$httpPromise;
      await this.storage.removeItem(actionKey);
      await this.storage.removeItem(instanceKey);

      deleted.push(action.cacheParams);
    });

    await Promise.all(actions);

    await this.cache.removeFromArrays(deleted);
  }
}