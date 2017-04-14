import { expect } from 'chai';
import { SyncLock } from '../lib/lock';

describe('SyncLock', () => {
  describe('#lock()', () => {
    it('should lock context', () => {
      const lock = new SyncLock();
      const context = 'TEST_CONTEXT';

      expect(lock['locks'] as any[]).not.to.contain(context);
      lock.lock(context);
      expect(lock['locks'] as any[]).to.contain(context);
    });

    it('should not lock context multiple times', () => {
      const lock = new SyncLock();
      const context = 'TEST_CONTEXT';

      lock.lock(context);
      expect((lock['locks'] as any[]).length).to.be.equal(1);

      lock.lock(context);
      expect((lock['locks'] as any[]).length).to.be.equal(1);
    });
  });

  describe('#isLocked()', () => {
    it('should lock context', () => {
      const lock = new SyncLock();
      const context = 'TEST_CONTEXT';
      expect(lock.isLocked(context)).to.be.false;
      lock.lock(context);
      expect(lock.isLocked(context)).to.be.true;
    });
  });

  describe('#isLockedAsync()', () => {
    it('should be resolved after release called', (done) => {
      const lock = new SyncLock();
      const context = 'TEST_CONTEXT';

      lock.lock(context);
      lock.isLockedAsync(context).then(() => done());
      lock.release(context);
    });
  });

  describe('#release()', () => {
    it('should release context', () => {
      const lock = new SyncLock();
      const context = 'TEST_CONTEXT';

      lock.lock(context);
      expect(lock['locks'] as any[]).to.contain(context);
      lock.release(context);
      expect(lock['locks'] as any[]).not.to.contain(context);
    });
  });
});