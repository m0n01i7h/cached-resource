import * as axios from 'axios';
import * as localforage from 'localforage';
import * as _ from 'lodash';

import { ResourceClass } from './resourceClass';
import { BrowserNetworkStateAdapter } from './networkState/browserAdapter';
import { ResourceTarget } from './abstract';
import { ActionMetadata, ResourceMetadata } from './metadata';

interface ResourceStatic {
  (config: ResourceMetadata): ClassDecorator;
  defaults?: ResourceMetadata;
}

function resource(config: ResourceMetadata): ClassDecorator {
  return (target: Function) => {
    const resourceTarget: ResourceTarget = target.prototype;
    const resource = resourceTarget.$resource = resourceTarget.$resource || new ResourceClass();
    resourceTarget.$compact = () => resource.compact();

    // Init resource on next tick.
    Promise.resolve().then(() => resource.init(_.defaults<ResourceMetadata>(config, Resource.defaults, { name: target['name'] })));
  };
}

export function Action(config: ActionMetadata): PropertyDecorator {
  return (target: any, key: string) => {
    const resourceTarget: ResourceTarget = target;
    const resource = resourceTarget.$resource = resourceTarget.$resource || new ResourceClass();

    resourceTarget[key] = resource.addAction(key, config);
  };
}

export const Resource: ResourceStatic = resource;
Resource.defaults = {
  url: '',
  http: axios,
  driver: localforage.LOCALSTORAGE,
  networkState: new BrowserNetworkStateAdapter(),
  reattemptInterval: 60000,
  autoCompact: true
};