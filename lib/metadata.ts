import { NetworkStateAdapter } from './abstract';

/**
 * Config of the resource.
 */
export interface ResourceMetadata {
  /**
   * Url patters for the http. Action params will be passed to the url according to this pattern.
   * Segments prefixed with `:` will be replaced with action params,
   * other will be used as the query string params.
   *
   * e.g. `/api/library/:libraryId/books(/:bookId)`
   * Param bookId is optional.
   */
  url: string;
  /**
   * Bounding param pattern.
   * @example
   *  ```typescript
   *  // Book resource with following structure:
   *  {
   *    id:1,
   *    libraryId: 1
   *  }
   *
   *  // Using following params pattern
   *  {
   *    bookId: '@id',
   *    libraryId: '@libraryId'
   *  }
   *
   *  // Will be mapped to the following action params
   *  {
   *    bookId: 1,
   *    libraryId: 1
   *  }
   * ```
   * Params prefixed with '@' will be picked from resource instance according to names.
   */
  params?: {};
  /**
   * Axios instance used as http framework.
   * Can be easily replaced with custom instance of the axios. For example to mock http in testing purposes.
   * @example
   * ```typescript
   *  @Resource({
   *    ...
   *    new MockAdapter(axios.create())
   *    ...
   * })
   * class BooksResource {...}
   * ```
   */
  http?: Axios.AxiosInstance;
  /**
   * Name of the LocalForage database. If name is not specified class name will be used.
   */
  name?: string;
  /**
   * Defer initialization of the resource.
   */
  bootstrap?: Promise<any>;
  /**
   * LocalForage driver.
   * @default localforage.LOCALSTORAGE
   */
  driver?: string | string[];
  /**
   * Whether to perform auto compaction after each array response.
   * Process similar to garbage collection.
   * It is not recommended to use auto compaction if it is expected to have large number of array responses, e.g pagination.
   * Use Resource defined $compact function on the instance of the decorated class.
   * @example
   * ```typescript
   *  await new BooksResource().$compact()
   * ```
   * @default true
   */
  autoCompact?: boolean;

  /**
   * Do not perform any actions over storage.
   * Note: if true 'httpOnly' field on action decorators will be ignored.
   * @default false
   */
  httpOnly?: boolean;
  /**
   * Network state adapter.
   * Used to determine if network capabilities of the application and also notify resource about getting online/offline
   * @default BrowserNetworkStateAdapter. Uses `navigator.online` and 'online'/'offline' events on the window.
   */
  networkState?: NetworkStateAdapter;
  /**
   * How often to try to perform actions over http if server is down (receives 5** codes)
   * @default 60000
   */
  reattemptInterval?: number;
}

/**
 * Config of the resource action.
 */
export interface ActionMetadata {
  /**
   * Action method.
   */
  method: 'get' | 'post' | 'put' | 'delete';
  /**
   * Threat response as array.
   */
  isArray?: boolean;
  /**
   * Request config
   */
  config?: Axios.AxiosXHRConfig<any>;
  /**
   * Override resource url.
   */
  url?: string;
  /**
   * Overrides resource bounding params.
   */
  params?: {};
  /**
   * Do not perform any actions over http.
   * @default false
   */
  localOnly?: boolean;
  /**
   * Do not perform any actions over storage.
   * @default false
   */
  httpOnly?: boolean;
}