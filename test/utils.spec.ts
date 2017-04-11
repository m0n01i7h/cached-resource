import { expect } from 'chai';
import { randomString } from '../lib/utils';

describe('#randomString()', () => {
  it('should generate given length', () => {
    const given = 15;
    expect(randomString(given).length).to.be.equal(given);
  });

  it('should generate default length', () => {
    expect(randomString().length).to.be.equal(12);
  });

  it('should contain alphanumeric', () => {
    expect(/^[a-zA-Z0-9]*$/.test(randomString())).to.be.true;
  });
});
