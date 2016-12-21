Provide to the application full offline experience by caching results of the http requests.
Puts actions like POST or DELETE in case if it is unable to perform them
due to server unavailability or offline state of the application to queue for future invocation.

Creation of this package was inspired by AngularJS [$resource]() and [$cachedResource]() modules.

## Few Example
```typescript
import { Action, Resource, ResourceArray, ResourceInstance } from 'cached-resource';

/**
 * Single instance of the resource
 */
export interface Comment extends ResourceInstance {
  id?: number;
  comment: string;
}

/**
 * Array of the resources
 */
export interface Comments extends Array<Comment>, ResourceArray { }

@Resource({
  name: 'Comments.db', // The name of the localForage collection
  url: '/api/articles/:articleId/comments(/:id)', // The url pattern '/:id' is an optional segment
  params: { articleId: '@articleId', id: '@id' } // Parameters pattern for passing fields from the resource to the url.
})
export class CommentsResource {
  // Threat response as an array. Pick from cache array by given params.
  @Action({ method: 'get', isArray: true })
  public readonly findAllByArticle: (params: { articleId: number }) => Comments;

  @Action({ method: 'get' })
  public readonly findOne: (params: { articleId: number, id: number }) => Comment;

  @Action({ method: 'get', localOnly: true })
  public readonly findOneCached: (params: { articleId: number, id: number }) => Comments;

  @Action({ method: 'post' })
  public readonly create: (params: { articleId: number }, comment: Comment) => Comment;

  @Action({ method: 'put' })
  public readonly update: (params: { }, comment: Comment) => Comment;

  @Action({ method: 'delete' })
  public readonly remove: (params: { }, comment: Comment) => Comment;
}

const commentsResource = new CommentsResource();
```

Since this package does not depend onto any certain framework there are no difficulties to use it as, for example, Angular 2.x provider

```typescript
import { Injectable, Component, ... } from '@angular/core';
import { Resource, ... } from 'cached-resource';

@Injectable()
@Resource({
  /// ...
})
class CommentsResource {
  /// ...
}

@Component(...)
class CommentsComponent {

  public  comments: Comments;

  constructor(
    private commentsResource: CommentsResource
  ) {
    this.comments = this.commentsResource.findAllByArticle({ articleId: 1 });
  }
}
```

## Decorators

### @Resource(metadata: ResourceMetadata)
Class decorator. Defines new http resource from the decorated class based on the given [ResourceMetadata](#resourcemetadata).


### @Action(metadata: ActionMetadata)
This property decorator defines resource action based on a given [ActionMetadata](#actionmetadata).

## Metadata

### ResourceMetadata
This metadata contains configuration information for the resource.

* `ResourceMetadata#url: String`
  Url patters for the http. Action params will be passed to the url according to this pattern.
  Segments prefixed with `:`(colon) will be replaced with action params, other will be passed to the query string params.

  Example

  ```typescript
  url: `/api/library/:libraryId/books(/:bookId)`
  ```
  Param `bookId` in this example is optional.

  See [url-pattern](https://www.npmjs.com/package/url-pattern) for extra information.


* `ResourceMetadata#params: Object`
  Bounding params pattern.
  This params used to map resource instance to url params and also as a key in the local data storage.
  Params prefixed with `@`(at) will be picked from resource instance according to names.

  ```typescript
  // Book resource with following structure:
  {
    id:1,
    libraryId: 1
  }

  // Using params pattern:
  {
    bookId: '@id',
    libraryId: '@libraryId'
  }

  // Will be mapped to the action params:
  {
    bookId: 1,
    libraryId: 1
  }
  ```

* `ResourceMetadata#http: AxiosInstance`
  Axios instance used as http framework.
  Can be easily replaced with custom instance of the axios. For example to mock http in testing purposes.

  ```typescript
  @Resource({
    ...
    http: new MockAdapter(axios.create())
    ...
  })
  class CommentsResource {...}
  ```

* `ResourceMetadata#name: String`
  Name of the LocalForage database. If name is not specified class name will be used.

* `driver: String | LocalForageDriver | LocalForageDriver[]`
  LocalForage driver.

  Default is `localforage.LOCALSTORAGE`

* `ResourceMetadata#autoCompact: Boolean`

  Whether to perform auto compaction after each array response is handled.
  Process is similar to garbage collection.

  It is not recommended to use auto compaction if it is expected to have large amount of array responses cached, e.g pagination.
  Use Resource defined `$compact` function on the instance of the decorated class to perform compaction manually e.g. on application start.

  ```typescript
  await new ArticlesResource().$compact()
  ```
  Default is `true`.

* `ResourceMetadata#networkState: NetworkStateAdapter`

  Network state adapter.
  Used to determine network availability state of the application.
  Also notify resource about application is getting online/offline

  Default is `BrowserNetworkStateAdapter`. Uses `navigator.online` property and 'online'/'offline' events on the window.

* `ResourceMetadata#reattemptInterval: number`
  How often to attempt to perform actions over http if server is unavailable (receives 5** codes)

  Default `60000` - every minute

### ActionMetadata
This metadata contains configuration information for the resource action.

* `ActionMetadata#method: 'get' | 'post' | 'put' | 'delete'`
  Action method.

  `Post` and `put` methods also create temporary instances so those instances will be added to the array.
  `Delete` method also removes instance from the local array.

* `ActionMetadata#isArray: Boolean`
  Threat response as array.

* `ActionMetadata#url: String`
  Override resource url.

* `ActionMetadata#params: Object`
  Overrides resource bounding params.

* `ActionMetadata#localOnly: Boolean`
  Do not perform any actions over http.

  Default is `false`

* `ActionMetadata#httpOnly: Boolean`
  Do not perform any actions over the local data storage.

  Default is `false`

## Interfaces

### ResourceInstance
Resource instance and indicators to determine whether it was resolved either by http or from cache.
Extend your instance model interfaces from this abstraction.

#### Example
```typescript
interface Comment extends ResourceInstance {
  id: number;
  content: string;
}
```

* `ResourceInstance#$new: Boolean`

  Whether the resource is newly created and not submitted to the server yet.
  Once resource is submitted this field will be deleted from the object.

* `ResourceInstance#$removed: Boolean`

  Whether the resource is removed or waiting for its removal due to server is unavailable.

* `ResourceInstance#$storagePromise: Promise<this>`

  Resolution of performing operations over the local data storage.
  Once resolved this field will be deleted from the object.

* `ResourceInstance#$httpPromise: Promise<this>`

  Resolution of performing operations over the http.
  Once resolved this field will be deleted from the object.

* `ResourceInstance#$formCache: Boolean`

  Whether the resource is from the local data storage.
  Once resolved over the http this field will be set to `true`.

* `ResourceInstance#toJSON() => Object`
  Produces regular JavaScript object from the resource.

### ResourceArray
  Represents an array of the resources and indicators to determine whether elements were resolved either by http or from cache.
  Extend your arrays model interfaces from this abstraction.

#### Example
```typescript
interface Comments extends Array<Comment> ResourceArray {
  id: number;
}
```

* `ResourceInstance#$storagePromise: Promise<this>`

  Resolution of performing operations over the local data storage.

* `ResourceInstance#$httpPromise: Promise<this>`

  Resolution of performing operations over the http.

* `ResourceInstance#$formCache: Boolean`

  Whether the resource is from the local data storage.

* `ResourceInstance#toJSON() => Object`

  Produces regular JavaScript array from the resource.


### NetworkStateAdapter
Used to determine network availability state.

* `isOnline: boolean`

  Indicates whether internet connection is available.

* `setOnlineHandler(handler: () => void) => void`

  Set handler to be called once application get online.

* `setOfflineHandler(handler: () => void) => void`

  Set handler to be called once application get offline.

## Resource object resolution
Note that resource instances combines with results of the http requests by `Object.assign(...)` like mechanism.
All the fields from response will be assigned to the resource instance due to server authority principle,
but fields which was already in the resource will not be removed from it.

## Local fields
Resource has *"local only"* fields. All the fields prefixed with `$`(dollar) or `__`(double underscore) will not be sent over http at all.
Such fields will be saved on the client side until they removed manually.
Thees fields useful to store some kind of meta information such as references to another resource or timestamps of performed actions.

## Reserved fields
Resource instances and resource arrays use some fields for internal purposes.

**Please do not override or delete or set them to avoid unexpected behavior.**

* `$fromCache` - Indicates whether array or instance is currently fetched from local data storage.
* `$new` - Indicates whether the resource instance is newly created.
* `$removed` - Indicates whether the resource instance is removed.
* `$query` - Reference to itself in local data storage. Used to keep tracking of new object.
* `$storagePromise` - Resolution of performing operations over the http.
* `$httpPromise` - Resolution of performing operations over the http.
