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

        resolve: { extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'] },
        externals: {
            _require: "require",
            photoshop: 'commonjs photoshop',
            uxp: 'commonjs uxp',
            os: 'commonjs os'
        },
        output: {
            filename: '[name].js',
            path: output
        },

        plugins,
    }
}

module.exports = (env, argv) => {
    const panelOutput = path.join(dist, `${panelName}.unsigned`);
    const uxpPanelConfig = createConfig(argv.mode, { uxp: "./src/index.tsx" }, path.join(dist, panelName), [
        new webpack.ProvidePlugin({
            _require: "_require"
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['uxp'], // 确保这里与webpack入口配置匹配
        }),
        new copyWebpackPlugin({
            patterns: [
                { from: "./manifest.json", to: "." },
                { from: "./src/assets/icons", to: "./icons" },
                { from: "./src/assets/SourceHanSansCN-Normal.otf", to: "." },
                { from: "./src/styles.css", to: "." }
            ]
        }),
        {
            apply: (compiler) => {
                compiler.hooks.afterEmit.tap('AfterEmitPlugin', async (compilation) => {
                    if (argv.mode === 'production') {
                        await signPanel(panelOutput);
                        await packageWindows();
                        await packageMac();
                    }
                });
            }
        }
    ]);
    return [uxpPanelConfig];
}