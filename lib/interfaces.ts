import { ResourceClass } from './resource';

export interface ResourceTarget {
  $resource: ResourceClass;
}

export interface ResourceMetadata {
  url: string;
  params?: {};
  http?: Axios.AxiosInstance;
  name?: string;
  driver?: string | LocalForageDriver | LocalForageDriver[];
  autoCompact?: boolean;
}

export interface ActionMetadata {
  method: 'get' | 'post' | 'put' | 'delete';
  isArray?: boolean;
  url?: string;
  params?: {};
  localOnly?: boolean;
  httpOnly?: boolean;
}

export interface ResourceBase {
  $storagePromise?: Promise<this>;
  $httpPromise?: Promise<this>;
  $formCache?: boolean;
}

export interface ResourceInstance extends ResourceBase {
  toObject?(): {};
}

export interface ResourceArray extends ResourceBase { }