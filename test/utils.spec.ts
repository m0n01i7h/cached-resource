import { expect } from 'chai';
import {
  randomString,
  getInstanceKey,
  getActionKey,
  getArrayKey,
  getUrl,
  getRandomParams,
  defer
} from '../lib/utils';

describe('Utils', () => {
  describe('#randomString()', () => {
    it('should generate given length', () => {
      const given = 15;
      expect(randomString(given).length).to.be.equal(given);
    });

    it('should generate default length', () => {
      expect(randomString().length).to.be.equal(12);
    });

    it('should contain alphanumeric', () => {
      expect(/^[a-zA-Z0-9]*$/.test(randomString())).to.be.true;
    });
  });

  describe('#getActionKey()', () => {
    it('should generate proper key', () => {
      expect(getActionKey({ a: 5, b: 'hello' })).to.be.equal('action?a=5&b=hello');
    });
  });

  describe('#getArrayKey()', () => {
    it('should generate proper key', () => {
      expect(getArrayKey({ a: 5, b: 'hello' })).to.be.equal('array?a=5&b=hello');
    });
  });

  describe('#getInstanceKey()', () => {
    it('should provide empty instance key', () => {
      const given = { testParam: 'testValue' };

      expect(getInstanceKey({ url: '' }, given)).to.be.equal('instance?');
    });

    it('should provide instance key by given params', () => {
      const params = { testParam1: '@testParam', testParam2: 'test' };
      const given = { testParam: 'testValue' };

      expect(getInstanceKey({ url: '', params }, given)).to.be.equal('instance?testParam1=testValue&testParam2=test');
    });
  });

  describe('#getUrl()', () => {
    it('should provide url without params', () => {
      expect(getUrl('/test-url', {})).to.be.equal('/test-url');
    });

    it('should provide url with params', () => {
      expect(getUrl('/test-url/:testParam', { testParam: 'testValue' })).to.be.equal('/test-url/testValue');
    });

    it('should provide url with query', () => {
      expect(getUrl('/test-url', { testParam: 'testValue' })).to.be.equal('/test-url?testParam=testValue');
    });
  });

  describe('#getRandomParams()', () => {
    it('should provide plain params', () => {
      const given = { testParam1: 10, testParam2: 'test' };
      const expected = { testParam1: 10, testParam2: 'test' };

      expect(getRandomParams(given)).to.be.deep.equal(expected);
    });

    it('should provide params from source', () => {
      const params = { testParam1: '@testParam', testParam2: 'test' };
      const given = { testParam: 'testValue' };
      const expected = { testParam1: 'testValue', testParam2: 'test' };

      expect(getRandomParams(params, given)).to.be.deep.equal(expected);
    });
  });

  describe('#defer()', () => {
    it('should resolve', (done) => {
      const def = defer();
      def.promise.then(done);
      def.resolve();
    });

    it('should reject', (done) => {
      const def = defer();
      def.promise.catch(done);
      def.reject();
    });
  });
});
