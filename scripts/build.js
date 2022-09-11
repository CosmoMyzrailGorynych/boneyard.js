import {rollup} from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import {terser} from 'rollup-plugin-terser';

// see below for details on these options
const inputOptions = {
    input: 'src/index.js',
    plugins: [resolve(), commonjs(), json()]
};

// you can create multiple outputs from the same input to generate e.g.
// different formats like CommonJS and ESM
const outputOptionsList = [{
    file: 'dist/boneyard.browser.js',
    format: 'iife',
    name: 'boneyard'
}, {
    file: 'dist/boneyard.browser.min.js',
    format: 'iife',
    plugins: [terser()],
    name: 'boneyard'
}, {
    file: 'dist/boneyard.esm.js',
    format: 'esm',
    name: 'boneyard'
}];

build();

async function build() {
    let bundle;
    let buildFailed = false;
    try {
        // create a bundle
        bundle = await rollup(inputOptions);
        // an array of file names this bundle depends on
        await generateOutputs(bundle);
    } catch (error) {
        buildFailed = true;
        console.error(error);
    }
    if (bundle) {
        await bundle.close();
    }
    process.exit(buildFailed ? 1 : 0);
}

async function generateOutputs(bundle) {
    for (const outputOptions of outputOptionsList) {
        await bundle.write(outputOptions);
    }
}