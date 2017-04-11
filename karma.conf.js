// Karma configuration
// Generated on Mon Apr 10 2017 23:17:30 GMT+0300 (Финляндия (лето))

var webpackConfig = require('./webpack.config.js');

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'chai', 'karma-typescript'],
    files: [
      'lib/**/*.ts',
      'test/**/*.ts',
    ],
    exclude: [
    ],
    preprocessors: {
      '**/*.ts': ['karma-typescript']
    },
    // mime: {
    //   'text/x-script': ['ts', 'tsx']
    // },
    reporters: ['progress', 'karma-typescript'],
    port: 9876,
    colors: true,
    webpack: webpackConfig,
    // webpack: {
    //   devtool: 'inline-source-map',
    //   // debug: true,
    //   resolve: webpackConfig.resolve,
    //   module: webpackConfig.module,
    // },
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
