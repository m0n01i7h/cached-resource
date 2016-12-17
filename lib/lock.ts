import * as _ from 'lodash';

/** @internal */
export class SyncLock {
  private locks: Array<any> = [];

  public lock(context: any) {
    if (this.isLocked(context)) {
      return;
    }

    this.locks.push(context);
  }

  public release(context: any) {
    _.remove(this.locks, lock => _.isEqual(lock, context));
  }

  public isLockedAsync(context: any) {
    return new Promise(resolve => {
      const checkLock = () => {
        if (!this.isLocked(context)) {
          return resolve();
        }
        setTimeout(() => checkLock(), 0);
      };
      checkLock();
    });
  }

  public isLocked(context: any) {
    return _.some(this.locks, lock => _.isEqual(lock, context));
  }
}

export const sync = new SyncLock();