import * as axios from 'axios';
import * as UrlPattern from 'url-pattern';
import * as _ from 'lodash';
import * as localforage from 'localforage';
import * as qs from 'qs';

import { ActionMetadata, ResourceMetadata, ResourceBase, ResourceInstance, ResourceArray } from './interfaces';
import { randomString } from './utils';

interface Action {
  action: string;
  cacheParams: {};
  httpParams: {};
}

class Resource implements ResourceInstance {

  public $storagePromise: Promise<this>;
  public $httpPromise: Promise<this>;

  constructor(object: {} = {}) {
    _.assign(this, object);
  }

  /**
   * Removes all reserved fields and functions before storing on client side
   */
  public toObject() {
    return _({})
      .assign(this)
      .omitBy((value, key) => /(^\$httpPromise|^\$storagePromise|^\$fromCache|^__|^\$\$)/.test(key))
      .omitBy(_.isFunction)
      .value()
      ;
  }

  /**
   * Removes all fields prepended with '$' or '__' to before sending request
   */
  public toRequestBody() {
    return _({})
      .assign(this)
      .omitBy((value, key) => /(^\$|^__)/.test(key))
      .omitBy(_.isFunction)
      .value()
      ;
  }
}

class ResourceList extends Array implements ResourceArray {
  public $storagePromise: Promise<this>;
  public $httpPromise: Promise<this>;

  constructor() {
    super();
  }
}

export class ResourceClass {

  private actions: { [key: string]: ActionMetadata } = {};
  private config: ResourceMetadata;
  private storage: LocalForage;

  public async init(config: ResourceMetadata) {
    this.config = config;
    this.storage = localforage.createInstance({
      name: config.name,
      storeName: 'keyvaluepairs',
      version: '1.0',
      driver: config.driver
    });

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
    const url = this.getUrl(
      actionConfig.url || this.config.url,
      _.assign({}, this.config.params || {}, actionConfig.params || {}, params),
      body
    );

    const resource: ResourceList | Resource = actionConfig.isArray
      ? new ResourceList()
      : new Resource(body)
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

    // this.config.axios.put(url, body);
    // this.config.axios.delete(url);
  }

  public compact() {

  }

  private invokeGetAction(url: string, params: {} = {}, actionConfig: ActionMetadata, resource: Resource | ResourceList) {

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.get(url)
        .then(res => this.handleResponse(params, actionConfig, res.data, resource) as any)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = (actionConfig.isArray
        ? this.findAll(params, resource as ResourceList)
        : this.findOne(params, resource as Resource))
        ;
    }

    return resource;
  }

  private invokePostAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    const cacheParams = this.getRandomParams(_.assign({}, this.config.params, params), resource);
    const httpParams = this.getParams(_.assign({}, this.config.params, params), resource);

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.post(url, new Resource(resource).toRequestBody())
        .then(res => this.handleResponse(params, actionConfig, res.data, resource as Resource) as any)
        .then(async () => this.replaceInArray(httpParams, cacheParams, resource as Resource))
        .catch(err => this.handleResponseError(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = this.save(httpParams, cacheParams, resource);
    }

    return resource;
  }

  private invokePutAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    const cacheParams = this.getRandomParams(_.assign({}, this.config.params, params), resource);
    const httpParams = this.getParams(_.assign({}, this.config.params, params), resource);

    if (!actionConfig.localOnly) {
      resource.$httpPromise = this.config.http.post(url, new Resource(resource).toRequestBody())
        .then(res => this.handleResponse(params, actionConfig, res.data, resource as Resource) as any)
        .catch(err => this.handleResponseError(action, err, actionConfig, cacheParams, httpParams) as Promise<any>)
        ;
    }

    if (!actionConfig.httpOnly) {
      resource.$storagePromise = this.save(httpParams, cacheParams, resource);
    }

    return resource;
  }

  private invokeDeleteAction(action: string, url: string, params: {} = {}, actionConfig: ActionMetadata, resource: ResourceBase) {
    return resource;
  }

  /**
   * Fill given resource with array of resource from cache by given params.
   */
  private async findAll(params: {} = {}, resource: ResourceList) {
    const array: Array<any> = await this.storage.getItem<Array<any>>(this.getArrayKey(params));

    if (!array) {
      throw new Error(`Array with params: '${JSON.stringify(this.getParams(this.config.params, params))}' not found in '${this.config.name}'.`);
    }

    for (let entry of array) {
      // create resource from item from storage
      let item = await this.storage.getItem(this.getInstanceKey(entry));
      item = new Resource(_.defaults(item, { $fromCache: true }));

      const where = this.getParams(this.config.params, item);
      const element = _.find(resource, where);

      if (element) {
        // if element found in resource array extend it with values from item from cache
        _.defaults(element, item);
      } else {
        // otherwise push item to resource
        resource.push(new Resource(item));
      }
    }

    delete resource.$storagePromise;
    // indicate resource array has cache origin
    return _.defaults<ResourceList>(resource, { $fromCache: true });
  }

  /**
   * Fill given resource with instance from cache by given params.
   */
  private async findOne(params: {} = {}, resource: Resource) {
    let item = await this.storage.getItem(this.getInstanceKey(params));

    if (!item) {
      throw new Error(`Instance with params: '${JSON.stringify(this.getParams(this.config.params, params))}' not found in '${this.config.name}'.`);
    }

    delete resource.$storagePromise;

    // indicate resource has cache origin
    return _.defaults<Resource>(resource, item, { $fromCache: true });
  }

  private async save(httpParams: {} = {}, cacheParams: {} = {}, resource: ResourceBase) {
    const arrayKey = this.getArrayKey(httpParams);
    const instanceKey = this.getInstanceKey(cacheParams);

    const array = await this.storage.getItem<Array<{}>>(arrayKey);

    // add new index to the array if the array does not contain
    if (!_.find(array, cacheParams)) {
      array.push(cacheParams);
    }

    await this.storage.setItem(arrayKey, array);

    // save new or update existing item in storage
    const item = await this.storage.getItem(instanceKey);
    await this.storage.setItem(instanceKey, new Resource(_.assign(item || {}, resource)).toObject());

    return resource;
  }

  private async remove(params: {}, resource: Resource) {

  }

  private async replaceInArray(httpParams: {}, cacheParams: {}, resource: Resource) {
    const arrayKey = this.getArrayKey(httpParams);
    const array = await this.storage.getItem<Array<{}>>(arrayKey) || [];

    _.remove(array, entry => _.isEqual(entry, cacheParams));
    array.push(this.getParams(_.assign({}, this.config.params || {}), resource));

    await this.storage.setItem(arrayKey, array);
    await this.storage.removeItem(this.getInstanceKey(cacheParams));

    return resource;
  }

  /**
   * Handle response
   */
  private handleResponse(params: {}, config: ActionMetadata, data: {} | Array<{}>, resource: Resource | ResourceList) {

    if (config.isArray && !_.isArray(data)) {
      throw new Error(`Resource expected an array but got ${typeof data}`);
    }

    if (config.isArray) {
      return this.handleArrayResponse(params, config, data as Array<{}>, resource as ResourceList);
    }

    delete resource.$httpPromise;

    return this.handleInstanceResponse(data, resource as Resource);
  }

  private async handleArrayResponse(params: {}, config: ActionMetadata, data: Array<{}>, resource: ResourceList) {

    for (let entry of data) {
      _.assign(entry, { $fromCache: false });

      let instance = _.find(resource, this.getParams(this.config.params, entry));

      if (instance) {
        _.assign(instance, entry);
      } else {
        resource.push(new Resource(entry));
      }

      // do not save anything to cache if action is httpOnly
      if (!config.httpOnly) {
        let item = await this.storage.getItem(this.getInstanceKey(entry));
        // override all fields of item excluding localOnly values and save to storage
        item = _.assign(item || {}, entry);

        await this.storage.setItem(
          this.getInstanceKey(entry),
          new Resource(item).toObject()
        );
      }
    }


    if (!config.httpOnly) {
      // save or update array
      this.storage.setItem(
        this.getArrayKey(params),
        (data as Array<any>).map(entry => this.getParams(_.assign({}, params, this.config.params || {}), entry))
      );
    }

    const temp = [].concat(resource);

    // clear resource array but save the reference to it
    resource.splice(0);

    // add elements to resource according in save order as responded array
    for (let entry of data as Array<{}>) {
      const element = _.find(temp, this.getParams(this.config.params, entry));
      resource.push(element);
    }

    // indicate resource has server origin
    _.assign(resource, { $fromCache: false });

    return resource;
  }

  private async handleInstanceResponse(data: {} | Array<{}>, resource: Resource) {
    _.assign(resource, data, { $fromCache: false });

    const item = await this.storage.getItem(this.getInstanceKey(resource));
    await this.storage.setItem(this.getInstanceKey(resource), _.assign(item || {}, resource.toObject()));

    return resource;
  }

  private async handleResponseError(action: string, err: Axios.AxiosXHR<any>, actionConfig: ActionMetadata, cacheParams: {}, httpParams: {}) {

    // skip adding pending action for httpOnly actions
    if (actionConfig.httpOnly) {
      throw err;
    }

    // save pending action if request was valid
    if (!err.status || err.status < 400 || err.status > 499) {
      await this.storage.setItem(
        this.getActionKey(cacheParams),
        {
          action: action,
          httpParams: httpParams,
          cacheParams: cacheParams
        } as Action
      );
    }

    // rethrow rejection
    throw err;
  }

  private async checkPendingActions() {
    const keys = _(await this.storage.keys()).filter(key => /^action/.test(key)).value();

    const actions = keys.map(async (key: string) => {
      const action = await this.storage.getItem<Action>(key);
      const item = await this.storage.getItem(this.getInstanceKey(action.cacheParams));

      if (!item) {
        return await this.storage.removeItem(key);
      }

      const resource = await this.invoke(action.action, action.httpParams, item, { httpOnly: true } as ActionMetadata);
      resource.$storagePromise.catch(() => {});

      await resource.$httpPromise;
      await this.storage.removeItem(key);
      await this.storage.removeItem(this.getInstanceKey(action.cacheParams));
    });

    return Promise.all(actions);
  }

  /**
   * Generates instance key from params
   */
  private getInstanceKey(source: {}) {
    return `instance?${qs.stringify(this.getParams(_.assign({}, this.config.params || {}), source))}`;
  }

  /**
   * Generates instance key from params
   */
  private getActionKey(source: {}) {
    return `action?${qs.stringify(source)}`;
  }

  /**
   * Generates collection key from params
   */
  private getArrayKey(source: {}) {
    return `array?${qs.stringify(source)}`;
  }

  /**
   * Pick params from source according to bound params map
   */
  private getParams(params: {} = {}, source: {} = {}) {
    return _.mapValues(params, param => _.isString(param) && _.startsWith(param, '@')
      ? source[param.substring(1)]
      : param
    );
  }

  /**
   * Generates url from url template, action params and action data
   */
  private getUrl(url: string, params: {}, source: {} = {}) {
    params = this.getParams(params, source);
    const pattern = new UrlPattern(url);
    let result = pattern.stringify(params);
    let query = _.omit(params, _.keys(pattern.match(result)));
    query = _(query).omitBy(_.isUndefined).omitBy(_.isNull).value();

    return result + (_.isEmpty(query) ? '' : `?${qs.stringify(query, { encode: false })}`);
  }

  /**
   * Generates params object with filled missed fields with random string.
   */
  private getRandomParams(params: {} = {}, source: {} = {}) {
    return _.defaults(
      _.mapValues(params, param => _.isString(param) && _.startsWith(param, '@')
        ? source[param.substring(1)]
        : param
      ),
      _.mapValues(params, param => _.isString(param) && _.startsWith(param, '@')
        ? randomString(24)
        : param)
    );
  }
}
