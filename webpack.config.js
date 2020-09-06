module.exports = {
    entry: {
        main: './main.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        /* pragma defines the function name when converting JSX,
                         * eg., if you replace "createElement" with "abc", you will see the browser 
                         * invoke abc to render.
                         * JSX code before convertion:
                         * <div>123</div>
                         * After:
                         * createElement.createElement("div", "123");
                        */ 
                        plugins: [['@babel/plugin-transform-react-jsx', {pragma: 'createElement'}]]
                    }
                }
            }
        ]
    },
    mode: "development",
    optimization: {
        minimize: false
    }
}