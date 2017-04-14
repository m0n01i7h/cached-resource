import { stub, spy } from 'sinon';
import { expect } from 'chai';

import { BrowserNetworkStateAdapter } from '../lib/networkState/browserAdapter';

describe('BrowserNetworkStateAdapter', () => {
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
      const adapter = new BrowserNetworkStateAdapter();

      (window.navigator as any).onLine = true;
      expect(adapter.isOnline).to.be.true;

      (window.navigator as any).onLine = false;
      expect(adapter.isOnline).to.be.false;
    });
  });

  describe('#setOnlineHandler()', () => {
    it('should set online handler', () => {
      const adapter = new BrowserNetworkStateAdapter();
      const handler = () => {};

      expect((adapter as any).onlineHandler).to.be.undefined;
      adapter.setOnlineHandler(handler);
      expect((adapter as any).onlineHandler).to.be.equal(handler);
    });
  });

  describe('#setOfflineHandler()', () => {
    it('should set online handler', () => {
      const adapter = new BrowserNetworkStateAdapter();
      const handler = () => {};

      expect((adapter as any).offlineHandler).to.be.undefined;
      adapter.setOfflineHandler(handler);
      expect((adapter as any).offlineHandler).to.be.equal(handler);
    });
  });

  describe('#onOnline()', () => {
    it('should call handler', () => {
      const adapter = new BrowserNetworkStateAdapter();
      const handler = () => {};
      const handlerSpy = spy(handler);

      expect((adapter as any).onOnline()).not.to.throw;

      (adapter as any).onlineHandler = handlerSpy;

      expect((adapter as any).onOnline()).not.to.throw;
      expect(handlerSpy.called).to.be.true;
    });

    it('should call from event', () => {
      const adapter = new BrowserNetworkStateAdapter();
      const onlineStub = stub(adapter, 'onOnline');
      window.dispatchEvent(new Event('online'));

      expect(onlineStub.called).to.be.true;
    });
  });

  describe('#onOffline()', () => {
    it('should call handler', () => {
      const adapter = new BrowserNetworkStateAdapter();
      const handler = () => {};
      const handlerSpy = spy(handler);

      expect((adapter as any).onOffline()).not.to.throw;

      (adapter as any).offlineHandler = handlerSpy;

      expect((adapter as any).onOffline()).not.to.throw;
      expect(handlerSpy.called).to.be.true;
    });

    it('should call from event', () => {
      const adapter = new BrowserNetworkStateAdapter();
      const onlineStub = stub(adapter, 'onOffline');
      window.dispatchEvent(new Event('offline'));

      expect(onlineStub.called).to.be.true;
    });
  });
});