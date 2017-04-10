// Karma configuration
// Generated on Mon Apr 10 2017 23:17:30 GMT+0300 (Финляндия (лето))

var webpackConfig = require('./webpack.config.js');

module.exports = function (config) {
  config.set({
    basePath: __dirname,
    frameworks: ['mocha', 'chai'],
    files: [
      'test/**/*.ts'
    ],
    exclude: [
    ],
    preprocessors: {
      'test/**/*.ts': ['webpack']
    },
    mime: {
      'text/x-typescript': ['ts', 'tsx']
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    webpack: {
      devtool: 'inline-source-map',
      // debug: true,
      resolve: webpackConfig.resolve,
      module: webpackConfig.module,
    },
    webpackMiddleware: {
      // quiet: true,
      stats: {
        colors: true,
        errorDetails: true,
      }
    },
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    concurrency: Infinity,
  })
}
