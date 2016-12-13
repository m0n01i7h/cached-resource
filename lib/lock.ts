import * as _ from 'lodash';

/** @internal */
export class SyncLock {
  private locks: Array<any> = [];

  public lock(context: any) {
    if (this.hasLock(context)) {
      return;
    }

    this.locks.push(context);
  }

  public release(context: any) {
    _.remove(this.locks, lock => _.isEqual(lock, context));
  }

  public isLocked(context: any) {
    return Promise.resolve(this.hasLock(context));
  }

  private hasLock(context: any) {
    return _.some(this.locks, lock => _.isEqual(lock, context));
  }
}