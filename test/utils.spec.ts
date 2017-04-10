import { expect } from 'chai';
import { randomString } from '../lib/utils';

describe('#randomString', () => {
  it('should generate given length', () => {
    const given = 15;
    expect(randomString(given).length).to.be.equal(16);
  });
});
