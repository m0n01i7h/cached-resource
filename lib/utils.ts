import * as axios from 'axios';
import * as UrlPattern from 'url-pattern';
import * as _ from 'lodash';
import * as localforage from 'localforage';
import * as qs from 'qs';

import { ResourceMetadata } from './metadata';

/**
 * @internal
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

/**
 * @internal
 * Generates instance key from params.
 */
export function getInstanceKey(config: ResourceMetadata, source: {}) {
  return `instance?${qs.stringify(getParams(_.assign({}, config.params || {}), source))}`;
}

/**
 * @internal
 * Generates instance key from params.
 */
export function getActionKey(source: {}) {
  return `action?${qs.stringify(source)}`;
}

/**
 * @internal
 * Generates collection key from params.
 */
export function getArrayKey(source: {}) {
  return `array?${qs.stringify(source)}`;
}

/**
 * @internal
 * Pick params from source according to bound params map.
 */
export function getParams(params: {} = {}, source: {} = {}) {
  return _.mapValues(params, param => _.isString(param) && _.startsWith(param, '@')
    ? source[param.substring(1)]
    : param
  );
}

/**
 * @internal
 * Creates url from url template, action params and action data.
 */
export function getUrl(url: string, params: {}, source: {} = {}) {
  params = getParams(params, source);
  const pattern = new UrlPattern(url);
  let result = pattern.stringify(params);
  let query = _.omit(params, _.keys(pattern.match(result)));
  query = _(query).omitBy(_.isUndefined).omitBy(_.isNull).value();

  return result + (_.isEmpty(query) ? '' : `?${qs.stringify(query, { encode: false })}`);
}

/**
 * @internal
 * Creates params object with filled missed fields with random string.
 */
export function getRandomParams(params: {} = {}, source: {} = {}) {
  return _.defaults(
    _.mapValues(params, param => _.isString(param) && _.startsWith(param, '@')
      ? source[param.substring(1)]
      : param
    ),
    _.mapValues(params, param => _.isString(param) && _.startsWith(param, '@')
      ? randomString(24)
      : param)
  );
}

/**
 * @internal
 * Creates externally resolvable defer.
 */
export function defer() {
  let resolve: Function;
  let reject: Function;
  const promise = new Promise<any>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { resolve, reject, promise };
}