// 模拟最小浏览器环境
global.document = { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {}, querySelector: () => ({}), createElement: () => ({}), createElementNS: () => ({}), body: { appendChild: () => {} } };
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.maplibregl = { Map: function(){}, NavigationControl: function(){}, ScaleControl: function(){} };
global.rough = { canvas: () => ({}) };
global.html2canvas = () => Promise.resolve();
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

const fs = require('fs');
let code = fs.readFileSync('/opt/data/doodlemap/app.js', 'utf8');

// 移除 const State 声明，改为 var
code = code.replace('const State = {', 'var State = {');

// 不调用 init()，只加载定义
code = code.replace(/\ninit\(\);/, '\n// init() called later\n');

eval(code);

// 设置 State.config
State.config = {
    proxy: 'http://172.17.0.1:7890',
    tileUrl: 'https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}.pbf',
    centerLng: 116.4074,
    centerLat: 39.9042,
    zoom: 11,
    font: 'ZCOOL KuaiLe',
    colorScheme: 'warm',
    exportScale: 2,
    roughness: 1.5,
};

// 测试三个 style
for (const style of ['handdrawn', 'cartoon', 'minimal']) {
    State.style = style;
    try {
        const s = buildMapStyle();
        console.log('Style', style, ': layers=', s.layers.length, 'glyphs=', s.glyphs, 'sprite=', s.sprite || 'NOT SET');
        
        for (const layer of s.layers) {
            if (layer.type === 'line' && layer.paint && layer.paint['line-dasharray'] !== undefined) {
                console.log('  ', layer.id, 'dasharray:', JSON.stringify(layer.paint['line-dasharray']));
            }
        }
    } catch(e) {
        console.log('Style', style, 'ERROR:', e.message, e.stack);
    }
}
console.log('DONE');
