const path = require('path');
const WorkerPlugin = require('worker-plugin');
module.exports = {
    mode: 'development',
    entry: './src/scalable-semantic-segmentation.ts',
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'scalable-semantic-segmentation.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [
        new WorkerPlugin()
    ]
};

