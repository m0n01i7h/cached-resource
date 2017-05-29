import axios from 'axios';
import * as localforage from 'localforage';
import * as _ from 'lodash';

import { ResourceService } from './resourceService';
import { BrowserNetworkStateAdapter } from './networkState/browserAdapter';
import { ResourceTarget, ResourceStatic } from './abstract';
import { ActionMetadata, ResourceMetadata } from './metadata';

function resource(config: ResourceMetadata): ClassDecorator {
  return (target: Function) => {
    const resourceTarget: ResourceTarget = target.prototype;
    const resource = resourceTarget.$resource = resourceTarget.$resource || new ResourceService();
    resourceTarget.$compact = () => resource.compact();
    resourceTarget.$clear = () => resource.clear();

    // Init resource on next tick.
    Promise.resolve().then(() => resource.init(_.defaults<ResourceMetadata>(config, Resource.common, { name: target['name'] })));
  };
}

/**
 * Property decorator. Defines a resource action.
 */
export function Action(config: ActionMetadata): PropertyDecorator {
  return (target: any, key: string) => {
    const resourceTarget: ResourceTarget = target;
    const resource = resourceTarget.$resource = resourceTarget.$resource || new ResourceService();

    resourceTarget[key] = resource.addAction(key, config);
  };
}

/**
 * Class decorator. Defines new http resource from the decorated class.
 * @param {ResourceMetadata} config Resource configurations.
 */
export const Resource: ResourceStatic = resource;
Resource.common = {
  url: '',
  http: axios,
  driver: localforage.LOCALSTORAGE,
  networkState: new BrowserNetworkStateAdapter(),
  reattemptInterval: 60000,
  autoCompact: true
};