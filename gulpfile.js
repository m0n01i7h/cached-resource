const gulp = require('gulp');
const path = require('path');
var webpack = require('webpack');
const gulpWebpack = require('gulp-webpack');
const tslint = require('gulp-tslint');
const clean = require('gulp-clean');
const typescript = require('gulp-typescript');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');;

gulp.task('env:prod', () => process.env.NODE_ENV = 'production');

gulp.task('build:prod', done => runSequence('env:prod', 'clean:declarations', 'build:declarations', 'build:src', done));
gulp.task('build', done => runSequence('clean:declarations', 'build:declarations', 'build:src', done));

gulp.task('build:src', () => gulp.src('./index.ts')
  .pipe(gulpWebpack(Object.assign(require('./webpack.config')), webpack))
  .pipe(gulp.dest('./dist/'))
);

gulp.task('build:declarations', () => gulp.src(['./**/*.ts', '!node_modules/**/*.*', '!typings/**/*.*', '!dist/**/*.*'])
  .pipe(typescript.createProject('tsconfig.json')())
  .dts
  .pipe(gulp.dest('./typings/'))
);

gulp.task('clean:declarations', () => gulp.src('./typings', { read: false })
  .pipe(clean())
);

gulp.task('watch', () => gulp.src('./index.ts')
  .pipe(gulpWebpack(Object.assign(require('./webpack.config'), { watch: true }), webpack))
  .pipe(gulp.dest('./dist/'))
);

gulp.task('tslint', () =>
  gulp.src(['lib/**/*.ts'])
    .pipe(tslint({ configuration: 'tslint.json' }))
    .pipe(tslint.report())
);

