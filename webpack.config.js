const HtmlWebpackPlugin = require('html-webpack-plugin');
const copyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require("path");

const panelName = `com.photoshop.jwautoadjust`;

const dist = path.join(__dirname, 'dist');

function createConfig(mode, entry, output, plugins) {
    return {
        entry,
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [ { loader: 'ts-loader', options: { transpileOnly: true, configFile: "tsconfig.json" } }],
                },
                { test: /\.css$/, use: ['style-loader', 'css-loader'] },
                { test: /\.(png|jpg|gif|webp|svg|zip|otf)$/, use: ['url-loader'] },
            ],
        },

        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
            // 强制选择默认导出，避免选择*.dev.js 开发入口，修复 UXP 环境下模块缺失与 lit 导出不匹配的问题
            conditionNames: ['import', 'module', 'browser', 'default']
        },
        externals: {
            _require: "require",
            photoshop: 'commonjs photoshop',
            uxp: 'commonjs uxp',
            os: 'commonjs os'
        },
        output: {
            filename: '[name].js',
            chunkFilename: '[name].js',
            publicPath: './',
            path: output
        },

        optimization: {
            splitChunks: false,
            runtimeChunk: false,
        },

        plugins,
    }
}

module.exports = (env, argv) => {
    const panelOutput = path.join(dist, `${panelName}.unsigned`);
    const uxpPanelConfig = createConfig(argv.mode, 
        // 修改入口名称：确保 polyfill 最先执行
        { bundle: ["./src/polyfills/dom-treewalker.ts", "./src/index.tsx"] }, 
        path.join(dist, panelName), 
        [
            new webpack.ProvidePlugin({
                _require: "_require"
            }),
            new HtmlWebpackPlugin({
                template: path.join(__dirname, 'src', 'index.html'),
                filename: 'index.html',
                // 只注入我们的入口 chunk，避免额外 vendor 名称注入
                chunks: ['bundle'],
                inject: 'body'
            }),
        new copyWebpackPlugin({
            patterns: [
                { from: "./manifest.json", to: "." },
                { from: "./src/assets/icons", to: "./icons" },
                // 修改字体文件路径，确保它与实际文件位置匹配
                { from: "./src/assets/fonts", to: "./fonts" },
                { from: "./src/styles", to: "." }
            ]
        }),
    ]);
    return [uxpPanelConfig];
}