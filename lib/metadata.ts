import { NetworkStateAdapter } from './abstract';

export interface ResourceMetadata {
  url: string;
  params?: {};
  http?: Axios.AxiosInstance;
  name?: string;
  driver?: string | LocalForageDriver | LocalForageDriver[];
  autoCompact?: boolean;
  networkState?: NetworkStateAdapter;
  reattemptInterval?: number;
}

export interface ActionMetadata {
  method: 'get' | 'post' | 'put' | 'delete';
  isArray?: boolean;
  url?: string;
  params?: {};
  localOnly?: boolean;
  httpOnly?: boolean;
}