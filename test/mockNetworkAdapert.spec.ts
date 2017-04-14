import { stub, spy } from 'sinon';
import { expect } from 'chai';

import { MockNetworkStateAdapter } from '../lib/networkState/mockAdapter';

describe('BrowserNetworkStateAdapter', () => {

  describe('#constructor()', () => {
    it('should create object', () => {
      const adapter = new MockNetworkStateAdapter();

      expect(window['$networkStateMock']).to.be.equal(adapter);
      expect(adapter['onLine']).to.be.false;
    });
  });

  describe('#isOnline', () => {
    let navigator: Navigator;

    before(() => {
      navigator = window.navigator;
      Object.defineProperty(window, 'navigator', { value: {} });
    });

    after(() => {
      Object.defineProperty(window, 'navigator', navigator);
    });

    it('should provide correct values', () => {
      const adapter = new MockNetworkStateAdapter();

      adapter['onLine'] = true;
      expect(adapter.isOnline).to.be.true;
      adapter['onLine'] = false;
      expect(adapter.isOnline).to.be.false;
    });
  });

  describe('#setOnlineHandler()', () => {
    it('should set online handler', () => {
      const adapter = new MockNetworkStateAdapter();
      const handler = () => {};

      expect((adapter as any).onlineHandler).to.be.undefined;
      adapter.setOnlineHandler(handler);
      expect((adapter as any).onlineHandler).to.be.equal(handler);
    });
  });

  describe('#setOfflineHandler()', () => {
    it('should set online handler', () => {
      const adapter = new MockNetworkStateAdapter();
      const handler = () => {};

      expect((adapter as any).offlineHandler).to.be.undefined;
      adapter.setOfflineHandler(handler);
      expect((adapter as any).offlineHandler).to.be.equal(handler);
    });
  });

  describe('#setOnline()', () => {
    it('should call handler', () => {
      const adapter = new MockNetworkStateAdapter();
      const handler = () => {};
      const handlerSpy = spy(handler);

      expect(adapter.setOnline()).not.to.throw;

      (adapter as any).onlineHandler = handlerSpy;

      expect(adapter.setOnline()).not.to.throw;
      expect(handlerSpy.called).to.be.true;
    });
  });

  describe('#setOffline()', () => {
    it('should call handler', () => {
      const adapter = new MockNetworkStateAdapter();
      const handler = () => {};
      const handlerSpy = spy(handler);

      expect(adapter.setOffline()).not.to.throw;

      (adapter as any).offlineHandler = handlerSpy;

      expect(adapter.setOffline()).not.to.throw;
      expect(handlerSpy.called).to.be.true;
    });
  });
});