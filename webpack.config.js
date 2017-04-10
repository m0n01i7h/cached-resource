const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TsConfigPathsPlugin = require('awesome-typescript-loader').TsConfigPathsPlugin;
const nodeExternals = require('webpack-node-externals');

const PRODUCTION = process.env.NODE_ENV === 'production';
const DEBUG = !PRODUCTION;

module.exports = {
  devtool: 'inline-source-map',
  entry: {
    index: path.join(__dirname, 'index'),
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: '[id].js',
    libraryTarget: 'commonjs2'
  },
  externals: nodeExternals(),
  stats: {
    colors: true
  },
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [
      path.join(__dirname, 'node_modules'),
      path.join(__dirname)
    ],
  },
  module: {
    rules: [
      { test: /\.ts$/, loaders: ['awesome-typescript-loader'] },
    ]
  },
  plugins: []
    .concat(
    [
      new TsConfigPathsPlugin(),
      new webpack.DefinePlugin({
        DEBUG: DEBUG,
        PRODUCTION: PRODUCTION,
        BUILD_TIME: new Date().toString()
      }),
      new CleanWebpackPlugin([
        path.join(__dirname, 'dist')
      ]),
    ])
    .concat(PRODUCTION ? [
      // additional plugins for production environment
      new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false } })
    ] : [])
}