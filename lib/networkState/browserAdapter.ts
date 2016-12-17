import { NetworkStateAdapter } from '../abstract';
/**
 * Basic network state handler based on navigator.online property and online/offline events
 */
export class BrowserNetworkStateAdapter implements NetworkStateAdapter {

  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
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

  private onOnline() {
    if (this.onlineHandler) {
      this.onlineHandler();
    }
  }

  private onOffline() {
    if (this.offlineHandler) {
      this.offlineHandler();
    }
  }
}