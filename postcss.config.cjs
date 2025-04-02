module.exports = (ctx) => ({
    map: { ... ctx.options.map, sourcesContent: false },
    plugins: [
        require("postcss-import-styled-js")(),
        require('postcss-preset-env')(),
        require("postcss-import")(),
        require("postcss-import-ext-glob")(),
        require("postcss-nested")(),
        require("cssnano")()
    ]
});
