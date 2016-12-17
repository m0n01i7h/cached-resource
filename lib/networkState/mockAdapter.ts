import { NetworkStateAdapter } from '../abstract';
/**
 * Basic network state handler based on navigator.online property and online/offline events
 */
export class MockNetworkStateAdapter implements NetworkStateAdapter {

  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    window['$networkStateMock'] = this;
  }

  public get isOnline() {
    return window.navigator.onLine;
  }

  public setOnlineHandler(handler: () => void) {
    this.onlineHandler = handler;
  }

  public setOfflineHandler(handler: () => void) {
    this.offlineHandler = handler;
  }

  public setOnline() {
    if (this.onlineHandler) {
      this.onlineHandler();
    }
  }

  public setOffline() {
    if (this.offlineHandler) {
      this.offlineHandler();
    }
  }
}