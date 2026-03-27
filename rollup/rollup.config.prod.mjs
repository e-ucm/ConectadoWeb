import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';
import del from 'rollup-plugin-delete';
import { babel } from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import url from '@rollup/plugin-url';
import glslify from 'rollup-plugin-glslify';

// Production
import terser from '@rollup/plugin-terser';

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
        file: './dist/bundle.js',
        name: 'PhaserTemplate',
        format: 'es',
        sourcemap: true
    },
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false,
            mainFields: ['module', 'main', 'browser']
        }),
        commonjs({
            include: /node_modules/,
            requireReturnsDefault: "auto"
        }),
        url(),
        glslify(),
        terser({
            format: {
                comments: false
            }
        }),
        del({
            targets: 'dist/*',
            runOnce: true
        }),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**'
        }),
        copy({
            targets: [
                { src: 'index.html', dest: 'dist/' },
                { src: 'public/*', dest: 'dist/' },
            ]
        }),
        phasermsg()
    ]
};