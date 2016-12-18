Goal of this library is providing to application full offline experience by caching results of the http requests.
Also this package puts actions like POST or DELETE in case of inability to perform them
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
  @Action({
    method: 'get',
    isArray: true // Threat response as an array. Pick from cache array by given params.
  })
  public readonly findAllByArticle: (params: { articleId: number }) => Comments;

  @Action({
    method: 'get'
  })
  public readonly findOne: (params: { articleId: number, id: number }) => Comment;

  @Action({
    method: 'get',
    localOnly: true
  })
  public readonly findOneCached: (params: { articleId: number, id: number }) => Comments;

  @Action({
    method: 'post'
  })
  public readonly create: (params: { articleId: number }, comment: Comment) => Comment;

  @Action({
    method: 'put'
  })
  public readonly update: (params: { }, comment: Comment) => Comment;

  @Action({
    method: 'delete'
  })
  public readonly remove: (params: { }, comment: Comment) => Comment;
}

const commentsResource = new CommentsResource();
```

Since this package is not depends onto certain framework there are no difficulties to use it as, for example, Angular 2.x provider

```typescript
import { Injectable, ... } from '@angular/core';
import { Resource, ... } from 'cached-resource';

@Injectable()
@Resource({
  /// ...
})
export class CommentsResource {
  /// ...
}
```

# Decorators

## `@Resource({...})`
Class decorator. Defines new http resource from the decorated class based on the given resource metadata.


## `@Action({...})`
This property decorator defines resource action based on a given ActionMetadata

#### Action metadata params

# Metadata

## `ResourceMetadata`
This metadata contains configuration information for the resource.

### `url: String`
Url patters for the http. Action params will be passed to the url according to this pattern.
Segments prefixed with `:`(colon) will be replaced with action params, other will be passed to the query string params.

Example
```typescript
url: `/api/library/:libraryId/books(/:bookId)`
```
Param `bookId` in this example is optional.

See [url-pattern](https://www.npmjs.com/package/url-pattern) for extra information.

---
### `params: Object`
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
---

### `http: AxiosInstance`

Axios instance used as http framework.
Can be easily replaced with custom instance of the axios. For example to mock http in testing purposes.

```typescript
@Resource({
  ...
  http: new MockAdapter(axios.create())
  ...
})
class BooksResource {...}
 ```

---

### `name: String`

Name of the LocalForage database. If name is not specified class name will be used.

---

### `driver: String | LocalForageDriver | LocalForageDriver[]`
LocalForage driver.

Default is `localforage.LOCALSTORAGE`

---

### `autoCompact: Boolean`

Whether to perform auto compaction after each array response is handled.
Process is similar to garbage collection.

It is not recommended to use auto compaction if it is expected to have large amount of array responses cached, e.g pagination.
Use Resource defined `$compact` function on the instance of the decorated class to perform compaction manually e.g. on application start.
```typescript
 await new BooksResource().$compact()
```
Default is `true`.

---

### `networkState: NetworkStateAdapter`

Network state adapter.
Used to determine network availability state of the application.
Also notify resource about application is getting online/offline

Default is `BrowserNetworkStateAdapter`. Uses `navigator.online` propery and 'online'/'offline' events on the window.

---

### `reattemptInterval: number`

How often to try to perform actions over http if server is unavailable (receives 5** codes)

Default `60000` - every minute

---

## `ActionMetadata`
This metadata contains configuration information for the resource action.

### `method: 'get' | 'post' | 'put' | 'delete'`

Action method.

`Post` and `put` methods also create temporary instances so those instances will be added to the array.
`Delete` method also removes instance from the local array.

---

### `isArray: Boolean`
Threat response as array.

---

### `url: String`

Override resource url.

---

### `params: Object`

Overrides resource bounding params.

---

### `localOnly: Boolean`
Do not perform any actions over http.

Default is `false`

---

### `httpOnly: Boolean`

Do not perform any actions over the local data storage.

Default is `false`

# Interfaces

## `ResourceArray`
Represents an array of the resources and indicators to determine whether elements were resolved either by http or from cache.

## `ResourceInstance`
Represents a resource instance and indicators to determine whether it was resolved either by http or from cache.