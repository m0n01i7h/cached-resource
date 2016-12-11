import * as axios from 'axios';
import * as localforage from 'localforage';
import * as _ from 'lodash';

import { ResourceClass } from './resource';
import { ActionMetadata, ResourceMetadata, ResourceTarget } from './interfaces';

interface ResourceStatic {
  (config: ResourceMetadata): ClassDecorator;
  defaults?: ResourceMetadata;
}

function resource(config: ResourceMetadata): ClassDecorator {
  return (target: Function) => {
    const resourceTarget: ResourceTarget = target.prototype;
    const resource = resourceTarget.$resource = resourceTarget.$resource || new ResourceClass();

    resource.init(_.defaults<ResourceMetadata>(config, Resource.defaults, { name: target['name'] }));
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
  driver: localforage.LOCALSTORAGE
};