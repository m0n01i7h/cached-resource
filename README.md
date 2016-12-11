## Example
```typescript
import { Injectable } from '@angular/core';
import { Action, Resource, ResourceArray, ResourceInstance } from 'cached-resource';

/**
 * Single instance of the resource
 */
export interface Comment extends ResourceInstance {
  id?: number;
  comment: string;
}

/**
 *
 */
export interface Comments extends Array<Note>, ResourceArray { }

@Resource({
  name: 'Comments.db', // The name of the localForage collection
  url: '/api/articles/:articleId/comments(/:id)', // The url pattern where '/:id' is an optional fragment
  params: { articleId: '@articleId', id: '@id' } // Parameters pattern for passing fields from the resource to the url.
})
export class CommentsResource {
  @Action({
    method: 'get',
    isArray: true // Threat response as an array. Picks from cache array by given params.
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
  public readonly add: (params: { articleId: number }, note: Comment) => Comment;
}

const commentsResource = new CommentsResource();
```

## Decorators

### `@Resource({...})`
This class decorator defines new resource based on a given ResourceMetadata

### `@Action{...}`
This property decorator defines resource action based on a given ActionMetadata

## Metadata

### `ResourceMetadata`
This metadata contains configuration information for the resource.

### `ActionMetadata`
This metadata contains configuration information for the resource action.

## Interfaces

### `ResourceArray`
Represents an array of the resources and indicators to determine whether elements were resolved either by http or from cache.

### `ResourceInstance`
Represents a resource instance and indicators to determine whether it was resolved either by http or from cache.