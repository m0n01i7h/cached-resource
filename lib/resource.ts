import * as _ from 'lodash';

import {
  ResourceInstance,
  ResourceArray
} from './abstract';

export class Resource implements ResourceInstance {

  public $storagePromise: Promise<this>;
  public $httpPromise: Promise<this>;

  constructor(object: {} = {}) {
    _.assign(this, object);
  }

  /**
   * Removes all reserved fields and functions before storing on client side
   */
  public toJSON() {
    return _({})
      .assign(this)
      .omitBy((value, key) => /(^\$httpPromise|^\$storagePromise|^\$fromCache|^\$removed|^__|^\$\$)/.test(key))
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

export class ResourceList extends Array<ResourceInstance> implements ResourceArray {
  public $storagePromise: Promise<this>;
  public $httpPromise: Promise<this>;

  constructor() {
    super();
  }
}