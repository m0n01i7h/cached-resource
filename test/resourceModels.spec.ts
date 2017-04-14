import { stub, spy } from 'sinon';
import { expect } from 'chai';

import { Resource, ResourceList } from '../lib/resourceModels';

describe('Resource', () => {
  describe('#constructor()', () => {
    it('should assign given value to itself', () => {
      const given = { a: 5, b: 'test' };
      const resource = new Resource(given);

      expect(resource['a']).to.be.deep.equal(given.a);
      expect(resource['b']).to.be.deep.equal(given.b);
    });
  });

  describe('#toRequestBody()', () => {
    it('should omit prefixed keys', () => {
      const given = { a: 5, b: 'test', __meta: 'meta', $meta: 'meta' };
      const resource = new Resource(given);

      expect(resource.toRequestBody()).to.be.deep.equal({ a: 5, b: 'test' });
    });
  });

  describe('#toJSON()', () => {
    it('should omit prefixed keys', () => {
      const given = {
        a: 5,
        b: 'test',
        __meta: 'meta',
        $meta: 'meta',
        $httpPromise: 'httpPromise',
        $storagePromise: 'storagePromise',
        $fromCache: 'fromCache',
        $removed: 'removed'
      };
      const resource = new Resource(given);

      expect(resource.toJSON()).to.be.deep.equal({ a: 5, b: 'test', $meta: 'meta' });
    });
  });
});

describe('ResourceList', () => {
  describe('#toJSON()', () => {
    const resource = new ResourceList();
    resource.toJSON()
    // expect(resource.toJSON().length).not.to.be.undefined;
  });
});
