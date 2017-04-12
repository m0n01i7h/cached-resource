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
    reporters: ['progress', 'karma-typescript'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity,
    karmaTypescriptConfig: {
      reports: {
        html: 'coverage',
        lcovonly: {
          directory: 'coverage',
          subdirectory: 'lcov',
          filename: 'lcov.info'
        }
      }
    }
  })
}
