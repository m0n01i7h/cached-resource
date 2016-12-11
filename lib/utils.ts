/**
 * Generates random alphanumeric string with given length.
 * @param {number} [length=12] - length of generated string.
 * @return random alphanumeric string.
 */
export function randomString(length: number = 12) {
  const arr: string[] = [];

  for (let i = 0; i < length; ++i) {
    arr.push(String.fromCharCode([
      // A..Z [65..90]
      65 + Math.round(Math.random() * (90 - 65)),
      // a..z [97..122]
      97 + Math.round(Math.random() * (122 - 97)),
      // 0..9 [48..57]
      48 + Math.round(Math.random() * (57 - 48))
    ][Math.round(Math.random() * 2)]));
  }

  return arr.join('');
}

export function enumerable(value: boolean) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.enumerable = value;
    } as PropertyDecorator;
}