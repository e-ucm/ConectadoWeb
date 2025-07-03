import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import del from 'rollup-plugin-delete';
import url from '@rollup/plugin-url';
import glslify from 'rollup-plugin-glslify';
import { babel } from '@rollup/plugin-babel';
import { fileURLToPath } from 'node:url';
import copy from 'rollup-plugin-copy';
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace';
import path from 'path';
// Production
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const phasermsg = () => {
    return {
        name: 'phasermsg',
        buildStart() {
            process.stdout.write(`Building for production...\n`);
        },
        buildEnd() {
            const line = "---------------------------------------------------------";
            const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
            process.stdout.write(`${line}\n${msg}\n${line}\n`);
        }
    }
}

export default {
    input: 'src/game.js',
    output: {
        file: path.resolve(__dirname, '../dist/bundle.js'),
        name: 'PhaserTemplate',
        format: 'iife',
        indent: false,
        sourcemap: !isProduction,
        minifyInternalExports: false,
        globals: {
            'js-tracker': 'js-tracker'
        }
    },
    plugins: [
        // Handle "this" context issues
        replace({
            preventAssignment: true,
            values: {
                'this': 'window',
                'typeof globalThis': "'object'",
                'typeof window': "'object'"
            }
        }),
        url({
            emitFiles: true
        }),
        alias({
            entries: [
                { 
                    find: 'phaser',
                    replacement: path.resolve(__dirname, '../node_modules/phaser/dist/phaser.min.js')
                },
                { 
                    find: 'js-tracker',
                    replacement: path.resolve(__dirname, '../src/js-tracker/dist/js-tracker.bundle.min.js') 
                },
            ]
        }),
         // Add Babel for better compatibility
        babel({
            babelHelpers: 'bundled',
            presets: ['@babel/preset-env'],
            exclude: 'node_modules/**'
        }),
        glslify(),
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs({
            include: path.resolve(__dirname, "../node_modules/"),
            transformMixedEsModules: true,
            dynamicRequireTargets: [
             // Add any dynamic requires here
            ]
        }),
        json(),
        copy({
            targets: [
            { src: path.resolve(__dirname,'../assets/'), dest: 'public/assets' }
            ],
            verbose: true
        }),
        isProduction && terser({
            compress: {
                passes: 2,
                global_defs: {
                '@production': true
                }
            }
        }),
        !isProduction && serve({
            open: true,
            contentBase: ['public', 'dist'],
            host: 'localhost',
            port: 8080,
            verbose: false,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        }),
        !isProduction && livereload({
            watch: ['public', 'dist'],
            port: 35730
        }),
        isProduction && phasermsg()
    ],
    watch: {
        clearScreen: false
    },
      onwarn: function (warning, warn) {
    // Suppress warnings about circular dependencies
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
    },
    external: [
        // List any external dependencies here
    ]
};