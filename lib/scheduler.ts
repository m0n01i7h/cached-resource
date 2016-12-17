import * as _ from 'lodash';

import { getInstanceKey, getActionKey } from './utils';
import { Cache } from './cache';
import { PendingAction } from './abstract';
import { ResourceClass } from './resourceClass';
import { ActionMetadata, ResourceMetadata } from './metadata';

export class ActionsScheduler {

  private intervalId: NodeJS.Timer;

  constructor(
    private storage: LocalForage,
    private config: ResourceMetadata,
    private resource: ResourceClass,
    private cache: Cache
  ) {
    this.checkPendingActions();

    this.config.networkState.setOnlineHandler(() => {
      this.checkPendingActions();
      this.enableAttempts();
    });

    this.config.networkState.setOfflineHandler(() => {
      this.disableAttempts();
    });
  }

  private async checkPendingActions() {
    if (!this.config.networkState.isOnline) {
      return;
    }

    const actionKeys = _(await this.storage.keys()).filter(key => /^action/.test(key)).value();
    const deleted = [];

    const actions = actionKeys.map(async (actionKey: string) => {
      const action = await this.storage.getItem<PendingAction>(actionKey);
      const instanceKey = getInstanceKey(this.config, action.cacheParams);
      const instance = await this.storage.getItem(instanceKey);

      if (!instance) {
        return await this.storage.removeItem(actionKey);
      }

      const resource = await this.resource.invoke(action.action, action.httpParams, instance, { httpOnly: true } as ActionMetadata);
      resource.$storagePromise.catch(() => { });

      await resource.$httpPromise;
      await this.storage.removeItem(actionKey);
      await this.storage.removeItem(instanceKey);

      deleted.push(action.cacheParams);
    });

    await Promise.all(actions);

    await this.cache.removeFromArrays(deleted);
  }

  public async addPendingAction(cacheParams: {}, action: PendingAction) {
    await this.storage.setItem(getActionKey(cacheParams), action);
  }

  private enableAttempts() {
    this.intervalId = setInterval(() => this.checkPendingActions(), this.config.reattemptInterval);
  }

  private disableAttempts() {
    clearInterval(this.intervalId);
  }
}