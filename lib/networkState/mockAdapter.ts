import { NetworkStateAdapter } from '../abstract';
/**
 * Basic network state handler based on navigator.online property and online/offline events
 */
export class MockNetworkStateAdapter implements NetworkStateAdapter {

  private onLine = false;

  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    window['$networkStateMock'] = this;
  }

  public get isOnline() {
    return this.onLine;
  }

  public setOnlineHandler(handler: () => void) {
    this.onlineHandler = handler;
  }

  public setOfflineHandler(handler: () => void) {
    this.offlineHandler = handler;
  }

  public setOnline() {
    this.onLine = true;
    if (this.onlineHandler) {
      this.onlineHandler();
    }
  }

  public setOffline() {
    this.onLine = false;
    if (this.offlineHandler) {
      this.offlineHandler();
    }
  }
}