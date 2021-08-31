let pluginComponent = () => {};
if (process.env.DISCUZ_ENV === 'mini') {
    // taro项目的小程序
    pluginComponent = require('./mini/index.jsx');
}
if (process.env.DISCUZ_ENV === 'web') {
    pluginComponent = require('./web/index.jsx');
}

export default pluginComponent.default;