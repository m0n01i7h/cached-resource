import * as _ from 'lodash';

import {
  getArrayKey,
  getInstanceKey,
  getParams
} from './utils';

import { ResourceMetadata } from './metadata';
import { ResourceBase } from './abstract';
import { SyncLock } from './lock';
import { Resource, ResourceList } from './resource';

export class Cache {
  constructor(
    private sync: SyncLock,
    private config: ResourceMetadata,
    private storage: LocalForage,
  ) { }

  /**
   * Fill given resource with array of resource from cache by given params.
   */
  public async findAll(params: {} = {}, resource: ResourceList) {
    const array: Array<any> = await this.storage.getItem<Array<any>>(getArrayKey(params));

    if (!array) {
      throw new Error(`Array not found in '${this.config.name}' by query '${JSON.stringify(getParams(this.config.params, params))}'`);
    }

    for (let entry of array) {
      // create resource from item from storage
      let item = await this.storage.getItem(getInstanceKey(this.config, entry));
      item = new Resource(_.defaults(item, { $fromCache: true }));

      const where = getParams(this.config.params, item);
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
  public async findOne(params: {} = {}, resource: Resource) {
    let item = await this.storage.getItem(getInstanceKey(this.config, params));

    if (!item) {
      throw new Error(`Instance not found in '${this.config.name}' by query '${JSON.stringify(getParams(this.config.params, params))}'.`);
    }

    delete resource.$storagePromise;

    // indicate resource has cache origin
    return _.defaults<Resource>(resource, item, { $fromCache: true });
  }

  public async saveOne(httpParams: {} = {}, cacheParams: {} = {}, resource: ResourceBase) {
    const arrayKey = getArrayKey(httpParams);
    const instanceKey = getInstanceKey(this.config, cacheParams);

    if (this.sync.isLocked(arrayKey)) {
      await this.sync.isLockedAsync(arrayKey);
    }
    try {
      // LOCK ARRAY
      this.sync.lock(arrayKey);

      const array = await this.storage.getItem<Array<{}>>(arrayKey);

      // add new index to the array if the array does not contain
      if (array && !_.find(array, cacheParams)) {
        array.push(cacheParams);
        await this.storage.setItem(arrayKey, array);
      }
    } finally {
      // UNLOCK ARRAY
      this.sync.release(arrayKey);
    }

    // save new or update existing item in storage
    const item = await this.storage.getItem(instanceKey);
    await this.storage.setItem(instanceKey, new Resource(_.assign(item || {}, resource)).toJSON());

    return resource;
  }

  public async saveAll(httpParams: {} = {}, resource: ResourceList) {
    // save or update instance
    for (let entry of resource) {
      let item = await this.storage.getItem(getInstanceKey(this.config, entry)) || {};
      // override all fields of item excluding localOnly values and save to storage
      item = _.assign(item, entry);

      await this.storage.setItem(
        getInstanceKey(this.config, entry),
        new Resource(item).toJSON()
      );
    }

    // save or update array
    await this.storage.setItem(
      getArrayKey(httpParams),
      resource.map(entry => getParams(_.assign({}, httpParams, this.config.params || {}), entry))
    );
  }

  public async remove(params: {}) {
    const instanceKey = getInstanceKey(this.config, params);
    await this.storage.removeItem(instanceKey);
  }

  public async removeFromArrays(params: Array<{}>) {
    const arrayKeys = _(await this.storage.keys()).filter(key => /^array/.test(key)).value();

    for (let arrayKey of arrayKeys) {
      if (this.sync.isLocked(arrayKey)) {
        await this.sync.isLockedAsync(arrayKey);
      }

      try {
        // LOCK ARRAY
        this.sync.lock(arrayKey);

        const array = await this.storage.getItem<Array<{}>>(arrayKey);

        for (let param of params) {
          _.remove(array, entry => _.isEqual(entry, param));
        }

        await this.storage.setItem(arrayKey, array);
      } finally {
        // UNLOCK ARRAY
        this.sync.release(arrayKey);
      }
    }
  }

  public async replaceInArray(httpParams: {}, cacheParams: {}, resource: Resource) {
    const arrayKey = getArrayKey(httpParams);

    if (this.sync.isLocked(arrayKey)) {
      await this.sync.isLockedAsync(arrayKey);
    }

    try {
      // LOCK ARRAY
      this.sync.lock(arrayKey);

      const array = await this.storage.getItem<Array<{}>>(arrayKey);

      if (array) {
        _.remove(array, entry => _.isEqual(entry, cacheParams));

        cacheParams = getParams(_.assign({}, this.config.params || {}), resource);

        // If array does not contain resource params add them.
        if (!_.some(array, entry => _.isEqual(entry, cacheParams))) {
          array.push(cacheParams);
        }

        await this.storage.setItem(arrayKey, array);
      }

    } finally {
      // UNLOCK ARRAY
      this.sync.release(arrayKey);
    }

    return resource;
  }

  /**
   * Remove all instances which are not constitute in any array
   */
  public compact() {

  }
}