/* ============================================
   DoodleMap — 手绘风格地图编辑器
   Phase 1-4 完整实现
   ============================================ */

// ===== Global State =====
const State = {
    map: null,
    style: 'handdrawn',       // handdrawn | cartoon | minimal
    markers: [],              // {id, type:'icon'|'text', lng, lat, element, data}
    selectedMarker: null,
    boundarySource: null,
    boundaryLayer: null,
    maskLayer: null,
    boundaryGeojson: null,    // Stored for restoring after style switch
    config: null,
    searchTimeout: null,
    iconCache: new Map(),
    roughCanvas: null,
    exportMode: false,
};

// ===== Default Config =====
const DEFAULT_CONFIG = {
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

// ===== Color Schemes =====
const COLOR_SCHEMES = {
    warm: {
        building: '#ffe0b2',
        buildingOutline: '#5d4037',
        road: '#8d6e63',
        roadCasing: '#5d4037',
        water: '#90caf9',
        waterOutline: '#42a5f5',
        land: '#c8e6c9',
        park: '#a5d6a7',
        text: '#3e2723',
        textHalo: '#fff',
        background: '#f5f0e6',
    },
    cool: {
        building: '#b3e5fc',
        buildingOutline: '#01579b',
        road: '#4fc3f7',
        roadCasing: '#0277bd',
        water: '#4fc3f7',
        waterOutline: '#0288d1',
        land: '#c8e6c9',
        park: '#81c784',
        text: '#01579b',
        textHalo: '#fff',
        background: '#e1f5fe',
    },
    vintage: {
        building: '#d7ccc8',
        buildingOutline: '#4e342e',
        road: '#a1887f',
        roadCasing: '#4e342e',
        water: '#b0bec5',
        waterOutline: '#78909c',
        land: '#dcedc8',
        park: '#aed581',
        text: '#3e2723',
        textHalo: '#fff8e1',
        background: '#f3e5d8',
    },
};

// ===== Style Presets =====
const STYLE_PRESETS = {
    handdrawn: {
        roadDash: [3, 2],
        roadBlur: 0.4,
        buildingFillOpacity: 0.7,
        waterFillOpacity: 0.5,
        textFont: ['Noto Sans Regular'],
        textHaloBlur: 1.5,
        textHaloWidth: 2,
        parkFillOpacity: 0.6,
    },
    cartoon: {
        roadDash: [1, 0],
        roadBlur: 0,
        buildingFillOpacity: 0.85,
        waterFillOpacity: 0.7,
        textFont: ['Noto Sans Regular'],
        textHaloBlur: 0.5,
        textHaloWidth: 3,
        parkFillOpacity: 0.75,
    },
    minimal: {
        roadDash: [1, 0],
        roadBlur: 0,
        buildingFillOpacity: 0.5,
        waterFillOpacity: 0.4,
        textFont: ['Noto Sans Regular'],
        textHaloBlur: 0,
        textHaloWidth: 1.5,
        parkFillOpacity: 0.4,
    },
};

// ===== Icon Collections =====
// Each entry: { set: 'icon-set-prefix', name: 'icon-name', label: '中文标签' }
const ICON_COLLECTIONS = {
    maki: [
        { set: 'maki', name: 'park', label: '公园' },
        { set: 'maki', name: 'building', label: '建筑' },
        { set: 'maki', name: 'restaurant', label: '餐厅' },
        { set: 'maki', name: 'cafe', label: '咖啡馆' },
        { set: 'maki', name: 'bar', label: '酒吧' },
        { set: 'maki', name: 'bakery', label: '面包店' },
        { set: 'maki', name: 'school', label: '学校' },
        { set: 'maki', name: 'hospital', label: '医院' },
        { set: 'maki', name: 'library', label: '图书馆' },
        { set: 'maki', name: 'museum', label: '博物馆' },
        { set: 'maki', name: 'theater', label: '剧院' },
        { set: 'maki', name: 'cinema', label: '电影院' },
        { set: 'maki', name: 'airport', label: '机场' },
        { set: 'maki', name: 'bus', label: '公交' },
        { set: 'maki', name: 'rail', label: '火车站' },
        { set: 'maki', name: 'metro', label: '地铁' },
        { set: 'maki', name: 'ferry', label: '渡轮' },
        { set: 'maki', name: 'bicycle', label: '自行车' },
        { set: 'maki', name: 'car', label: '汽车' },
        { set: 'maki', name: 'parking', label: '停车场' },
        { set: 'maki', name: 'fuel', label: '加油站' },
        { set: 'maki', name: 'entrance', label: '入口' },
        { set: 'maki', name: 'information', label: '信息' },
        { set: 'maki', name: 'castle', label: '城堡' },
    ],
    food: [
        { set: 'maki', name: 'restaurant', label: '餐厅' },
        { set: 'maki', name: 'cafe', label: '咖啡馆' },
        { set: 'maki', name: 'bar', label: '酒吧' },
        { set: 'maki', name: 'bakery', label: '面包店' },
        { set: 'maki', name: 'fast-food', label: '快餐' },
        { set: 'maki', name: 'ice-cream', label: '冰激凌' },
        { set: 'ph', name: 'coffee', label: '咖啡' },
        { set: 'ph', name: 'wine', label: '红酒' },
        { set: 'ph', name: 'beer-stein', label: '啤酒' },
        { set: 'ph', name: 'cake', label: '蛋糕' },
        { set: 'ph', name: 'fork-knife', label: '餐具' },
        { set: 'ph', name: 'bowl-food', label: '碗食' },
        { set: 'tabler', name: 'bread', label: '面包' },
        { set: 'tabler', name: 'salad', label: '沙拉' },
        { set: 'icon-park-outline', name: 'watermelon', label: '西瓜' },
        { set: 'icon-park-outline', name: 'cherry', label: '樱桃' },
    ],
    transport: [
        { set: 'maki', name: 'airport', label: '机场' },
        { set: 'maki', name: 'bus', label: '公交' },
        { set: 'maki', name: 'rail', label: '火车站' },
        { set: 'maki', name: 'metro', label: '地铁' },
        { set: 'maki', name: 'ferry', label: '渡轮' },
        { set: 'maki', name: 'bicycle', label: '自行车' },
        { set: 'maki', name: 'car', label: '汽车' },
        { set: 'maki', name: 'parking', label: '停车场' },
        { set: 'maki', name: 'fuel', label: '加油站' },
        { set: 'maki', name: 'entrance', label: '入口' },
        { set: 'ph', name: 'airplane', label: '飞机' },
        { set: 'ph', name: 'airplane-takeoff', label: '起飞' },
        { set: 'ph', name: 'airplane-landing', label: '降落' },
        { set: 'ph', name: 'taxi', label: '出租车' },
        { set: 'ph', name: 'scooter', label: '滑板车' },
        { set: 'tabler', name: 'ship', label: '轮船' },
        { set: 'tabler', name: 'helicopter', label: '直升机' },
    ],
    nature: [
        { set: 'maki', name: 'park', label: '公园' },
        { set: 'maki', name: 'tree', label: '树木' },
        { set: 'maki', name: 'garden', label: '花园' },
        { set: 'maki', name: 'mountain', label: '山脉' },
        { set: 'maki', name: 'water', label: '水域' },
        { set: 'maki', name: 'wetland', label: '湿地' },
        { set: 'maki', name: 'forest', label: '森林' },
        { set: 'maki', name: 'flower', label: '花卉' },
        { set: 'maki', name: 'campsite', label: '露营' },
        { set: 'ph', name: 'tree', label: '树' },
        { set: 'ph', name: 'mountain', label: '山' },
        { set: 'ph', name: 'flower', label: '花' },
        { set: 'ph', name: 'leaf', label: '叶子' },
        { set: 'ph', name: 'sun', label: '太阳' },
        { set: 'ph', name: 'cloud', label: '云' },
        { set: 'tabler', name: 'trees', label: '树林' },
        { set: 'tabler', name: 'mushroom', label: '蘑菇' },
    ],
    building: [
        { set: 'maki', name: 'building', label: '建筑' },
        { set: 'maki', name: 'school', label: '学校' },
        { set: 'maki', name: 'hospital', label: '医院' },
        { set: 'maki', name: 'library', label: '图书馆' },
        { set: 'maki', name: 'museum', label: '博物馆' },
        { set: 'maki', name: 'theater', label: '剧院' },
        { set: 'maki', name: 'cinema', label: '电影院' },
        { set: 'maki', name: 'castle', label: '城堡' },
        { set: 'maki', name: 'town-hall', label: '市政厅' },
        { set: 'maki', name: 'prison', label: '监狱' },
        { set: 'tabler', name: 'building-church', label: '教堂' },
        { set: 'tabler', name: 'building-hospital', label: '医院楼' },
        { set: 'tabler', name: 'building-store', label: '商店' },
        { set: 'ph', name: 'house', label: '房屋' },
        { set: 'ph', name: 'buildings', label: '楼群' },
        { set: 'icon-park-outline', name: 'hotel', label: '酒店' },
    ],
};

// Category display names (Chinese)
const CATEGORY_LABELS = {
    all: '全部',
    maki: '地标',
    food: '美食',
    transport: '交通',
    nature: '自然',
    building: '建筑',
};

// ===== Init =====
function init() {
    loadConfig();
    initMap();
    initToolbar();
    initSearch();
    initIconPanel();
    initConfigPanel();
    initTextModal();
    initMarkerToolbar();
    initKeyboard();
}

// ===== Config Management =====
function loadConfig() {
    const saved = localStorage.getItem('doodlemap_config');
    State.config = saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
}

function saveConfig() {
    localStorage.setItem('doodlemap_config', JSON.stringify(State.config));
}

function getConfig(key, fallback) {
    return State.config[key] !== undefined ? State.config[key] : fallback;
}

// ===== Map Initialization =====
function initMap() {
    const cfg = State.config;
    
    State.map = new maplibregl.Map({
        container: 'map',
        style: buildMapStyle(),
        center: [cfg.centerLng, cfg.centerLat],
        zoom: cfg.zoom,
        attributionControl: true,
        hash: false,
    });

    State.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    State.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    State.map.on('load', () => {
        hideMapLoading();
        addBoundaryLayers();
    });

    State.map.on('styledata', () => {
        if (State.map.getLayer('boundary-line')) {
            // Re-add boundary if style changed
        }
    });

    // Click on map deselects marker
    State.map.on('click', (e) => {
        if (State.selectedMarker) {
            deselectMarker();
        }
    });
}

function buildMapStyle() {
    const scheme = COLOR_SCHEMES[State.config.colorScheme] || COLOR_SCHEMES.warm;
    const preset = STYLE_PRESETS[State.style] || STYLE_PRESETS.handdrawn;
    const tileUrl = State.config.tileUrl;

    return {
        version: 8,
        name: 'DoodleMap',
        sources: {
            versatiles: {
                type: 'vector',
                tiles: [tileUrl],
                maxzoom: 14,
                attribution: '© OpenStreetMap contributors | VersaTiles',
            },
        },
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        layers: [
            // Background
            {
                id: 'background',
                type: 'background',
                paint: { 'background-color': scheme.background },
            },
            // Land (base)
            {
                id: 'land',
                type: 'fill',
                source: 'versatiles',
                'source-layer': 'land',
                paint: {
                    'fill-color': scheme.land,
                    'fill-opacity': preset.parkFillOpacity,
                },
            },
            // Water polygons
            {
                id: 'water',
                type: 'fill',
                source: 'versatiles',
                'source-layer': 'water_polygons',
                paint: {
                    'fill-color': scheme.water,
                    'fill-opacity': preset.waterFillOpacity,
                },
            },
            {
                id: 'water-outline',
                type: 'line',
                source: 'versatiles',
                'source-layer': 'water_polygons',
                paint: {
                    'line-color': scheme.waterOutline,
                    'line-width': 1,
                    'line-blur': preset.roadBlur * 0.5,
                },
            },
            // Water lines (rivers/streams)
            {
                id: 'water-lines',
                type: 'line',
                source: 'versatiles',
                'source-layer': 'water_lines',
                paint: {
                    'line-color': scheme.waterOutline,
                    'line-width': 2,
                    'line-blur': preset.roadBlur,
                },
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round',
                },
            },
            // Parks and green areas (land layer subset)
            {
                id: 'parks',
                type: 'fill',
                source: 'versatiles',
                'source-layer': 'land',
                filter: ['==', ['get', 'kind'], 'park'],
                paint: {
                    'fill-color': scheme.park,
                    'fill-opacity': preset.parkFillOpacity,
                },
            },
            // Buildings
            {
                id: 'buildings',
                type: 'fill',
                source: 'versatiles',
                'source-layer': 'buildings',
                paint: {
                    'fill-color': scheme.building,
                    'fill-opacity': preset.buildingFillOpacity,
                },
            },
            {
                id: 'buildings-outline',
                type: 'line',
                source: 'versatiles',
                'source-layer': 'buildings',
                paint: {
                    'line-color': scheme.buildingOutline,
                    'line-width': 0.5,
                    'line-blur': preset.roadBlur * 0.3,
                },
            },
            // Streets casing
            {
                id: 'streets-casing',
                type: 'line',
                source: 'versatiles',
                'source-layer': 'streets',
                paint: {
                    'line-color': scheme.roadCasing,
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        10, 1,
                        14, 3,
                        18, 6,
                    ],
                    'line-blur': preset.roadBlur,
                },
                layout: {
                    'line-cap': 'round',
                    'line-join': 'round',
                },
            },
            // Streets fill (dashed for handdrawn)
            (() => {
                const paint = {
                    'line-color': scheme.road,
                    'line-width': [
                        'interpolate', ['linear'], ['zoom'],
                        10, 0.5,
                        14, 1.5,
                        18, 4,
                    ],
                    'line-blur': preset.roadBlur * 0.5,
                };
                if (preset.roadDash[1] > 0) {
                    paint['line-dasharray'] = preset.roadDash;
                }
                return {
                    id: 'streets-fill',
                    type: 'line',
                    source: 'versatiles',
                    'source-layer': 'streets',
                    paint,
                    layout: {
                        'line-cap': preset.roadDash[1] > 0 ? 'butt' : 'round',
                        'line-join': 'round',
                    },
                };
            })(),
            // Boundary lines
            {
                id: 'boundaries',
                type: 'line',
                source: 'versatiles',
                'source-layer': 'boundaries',
                paint: {
                    'line-color': scheme.buildingOutline,
                    'line-width': 1,
                    'line-dasharray': [2, 2],
                    'line-opacity': 0.5,
                },
            },
            // POI labels
            {
                id: 'poi-labels',
                type: 'symbol',
                source: 'versatiles',
                'source-layer': 'pois',
                minzoom: 14,
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': preset.textFont,
                    'text-size': 11,
                    'text-offset': [0, 1],
                    'text-anchor': 'top',
                    'text-allow-overlap': false,
                },
                paint: {
                    'text-color': scheme.text,
                    'text-halo-color': scheme.textHalo,
                    'text-halo-width': preset.textHaloWidth,
                    'text-halo-blur': preset.textHaloBlur,
                },
            },
            // Street labels
            {
                id: 'street-labels',
                type: 'symbol',
                source: 'versatiles',
                'source-layer': 'street_labels',
                minzoom: 13,
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': preset.textFont,
                    'text-size': 12,
                    'text-allow-overlap': false,
                    'symbol-placement': 'line',
                    'text-offset': [0, 0.5],
                },
                paint: {
                    'text-color': scheme.text,
                    'text-halo-color': scheme.textHalo,
                    'text-halo-width': preset.textHaloWidth,
                    'text-halo-blur': preset.textHaloBlur,
                },
            },
            // Place labels (cities, districts)
            {
                id: 'place-labels',
                type: 'symbol',
                source: 'versatiles',
                'source-layer': 'place_labels',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': preset.textFont,
                    'text-size': [
                        'interpolate', ['linear'], ['zoom'],
                        3, 12,
                        8, 16,
                        12, 20,
                    ],
                    'text-allow-overlap': false,
                },
                paint: {
                    'text-color': scheme.text,
                    'text-halo-color': scheme.textHalo,
                    'text-halo-width': preset.textHaloWidth + 1,
                    'text-halo-blur': preset.textHaloBlur,
                },
            },
            // Water labels
            {
                id: 'water-labels',
                type: 'symbol',
                source: 'versatiles',
                'source-layer': 'water_polygons_labels',
                minzoom: 10,
                layout: {
                    'text-field': ['get', 'name'],
                    'text-font': preset.textFont,
                    'text-size': 12,
                },
                paint: {
                    'text-color': scheme.waterOutline,
                    'text-halo-color': '#fff',
                    'text-halo-width': 1.5,
                    'text-halo-blur': 0.5,
                },
            },
        ],
    };
}

function switchStyle(styleName) {
    State.style = styleName;
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === styleName);
    });
    
    showMapLoading('切换风格中...');
    State.map.setStyle(buildMapStyle());
    
    // Track if we've already handled the style change
    let styleHandled = false;
    const handleStyleReady = () => {
        if (styleHandled) return;
        styleHandled = true;
        clearTimeout(timeoutId);
        // Re-add boundary layers after style change
        addBoundaryLayers();
        // Restore boundary data if we have it stored
        if (State.boundaryGeojson) {
            restoreBoundaryData();
        }
        // Re-add any existing markers (they're DOM overlays, survive style change)
        hideMapLoading();
    };
    
    // Primary: wait for styledata event
    State.map.once('styledata', handleStyleReady);
    
    // Fallback: force complete after 10 seconds even if styledata hasn't fired
    const timeoutId = setTimeout(() => {
        if (!styleHandled) {
            console.warn('Style switch timed out after 10s, forcing completion');
            handleStyleReady();
        }
    }, 10000);
}

// ===== Boundary Layers =====
function addBoundaryLayers() {
    // Mask source: world-with-hole polygon that darkens everything outside the boundary
    if (!State.map.getSource('boundary-mask')) {
        State.map.addSource('boundary-mask', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    
    // Boundary line source: just the boundary outline
    if (!State.map.getSource('boundary-line-src')) {
        State.map.addSource('boundary-line-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
        });
    }
    
    // Mask layer (dark overlay outside boundary)
    if (!State.map.getLayer('boundary-mask')) {
        State.map.addLayer({
            id: 'boundary-mask',
            type: 'fill',
            source: 'boundary-mask',
            paint: {
                'fill-color': '#000',
                'fill-opacity': 0.25,
            },
        });
    }
    
    // Boundary outline (hand-drawn dashed red line, high visibility)
    if (!State.map.getLayer('boundary-outline')) {
        State.map.addLayer({
            id: 'boundary-outline',
            type: 'line',
            source: 'boundary-line-src',
            paint: {
                'line-color': '#e74c3c',
                'line-width': 4,
                'line-dasharray': [6, 3],
                'line-opacity': 0.9,
            },
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
        });
    }
}

// ===== Search (Photon + Nominatim) =====
function initSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    input.addEventListener('input', (e) => {
        clearTimeout(State.searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            results.classList.add('hidden');
            return;
        }
        
        State.searchTimeout = setTimeout(() => searchPhoton(query), 350);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = input.value.trim();
            if (query.length >= 2) {
                searchPhoton(query);
            }
        }
    });

    // Close results on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-container')) {
            results.classList.add('hidden');
        }
    });
}

async function searchPhoton(query) {
    const results = document.getElementById('search-results');
    results.classList.remove('hidden');
    results.innerHTML = '<div class="search-result-item"><div class="search-result-detail">搜索中...</div></div>';

    try {
        const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        
        if (!data.features || data.features.length === 0) {
            results.innerHTML = '<div class="search-result-item"><div class="search-result-detail">未找到结果</div></div>';
            return;
        }

        results.innerHTML = '';
        data.features.forEach((feature) => {
            const props = feature.properties;
            const [lng, lat] = feature.geometry.coordinates;
            
            const name = props.name || '未知';
            const detail = [
                props.city,
                props.state,
                props.country,
            ].filter(Boolean).join(', ');

            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-name">${name}</div>
                ${detail ? `<div class="search-result-detail">${detail}</div>` : ''}
            `;
            item.addEventListener('click', () => {
                selectSearchResult(name, lat, lng, props.osm_id, props.osm_type);
                results.classList.add('hidden');
                document.getElementById('search-input').value = name;
            });
            results.appendChild(item);
        });
    } catch (err) {
        console.error('Photon search error:', err);
        results.innerHTML = '<div class="search-result-item"><div class="search-result-detail">搜索失败，请重试</div></div>';
    }
}

async function selectSearchResult(name, lat, lng, osmId, osmType) {
    showMapLoading(`定位 ${name}...`);
    
    // First, fly to the location
    State.map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 2000,
    });

    // Try to get boundary from Nominatim
    try {
        const boundary = await fetchBoundary(osmId, osmType);
        if (boundary) {
            displayBoundary(boundary);
            showToast(`已定位到 ${name} 并显示边界`, 'success');
        } else {
            showToast(`已定位到 ${name}（未找到边界数据）`, 'success');
        }
    } catch (err) {
        console.error('Boundary fetch error:', err);
        showToast(`已定位到 ${name}（边界获取失败）`, 'success');
    }
    
    hideMapLoading();
}

async function fetchBoundary(osmId, osmType) {
    // Photon returns osm_type as 'N', 'W', or 'R'
    // Nominatim lookup uses first letter: N, W, R
    if (!osmId || !osmType) return null;
    
    const osmIdStr = `${osmType}${osmId}`;
    
    // Use our backend proxy endpoint (server.py handles the HTTP proxy to Nominatim)
    // The proxy correctly routes to lookup API for osm_ids
    const proxyUrl = `/api/nominatim?osm_ids=${osmIdStr}&format=json&polygon_geojson=1&addressdetails=0`;
    
    // Also try direct (works if user's browser can reach Nominatim)
    const directUrl = `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmIdStr}&format=json&polygon_geojson=1&addressdetails=0`;
    
    const urls = [proxyUrl, directUrl];
    
    for (const url of urls) {
        try {
            const response = await fetch(url, {
                headers: url.startsWith('/api/') ? {} : {
                    'User-Agent': 'DoodleMap/1.0 (map editor)',
                },
                signal: AbortSignal.timeout(15000),
            });
            
            if (!response.ok) continue;
            
            const data = await response.json();
            if (data && data.length > 0 && data[0].geojson) {
                return data[0].geojson;
            }
        } catch (err) {
            console.warn(`Boundary fetch failed for ${url}:`, err.message);
            continue;
        }
    }
    
    // Fallback: try Nominatim search by name through our proxy
    // (useful when osm_id doesn't have polygon data)
    return null;
}

function displayBoundary(geojson) {
    // Store the geojson so we can restore it after style switches
    State.boundaryGeojson = geojson;
    
    // Create a mask: everything outside boundary is darkened
    const worldBounds = [
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
    ];
    
    // Build mask polygon (world with hole = boundary outer ring)
    let maskCoords;
    if (geojson.type === 'Polygon') {
        maskCoords = [worldBounds, geojson.coordinates[0]];
    } else if (geojson.type === 'MultiPolygon') {
        // For MultiPolygon, use the first polygon's outer ring as the hole
        maskCoords = [worldBounds, geojson.coordinates[0][0]];
    } else {
        console.warn('Unexpected geojson type:', geojson.type);
        return;
    }
    
    const maskFeature = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: maskCoords,
        },
    };
    
    const boundaryFeature = {
        type: 'Feature',
        geometry: geojson,
    };
    
    // Update mask source
    State.map.getSource('boundary-mask').setData({
        type: 'FeatureCollection',
        features: [maskFeature],
    });
    
    // Update boundary line source
    State.map.getSource('boundary-line-src').setData({
        type: 'FeatureCollection',
        features: [boundaryFeature],
    });
    
    // Fit bounds to boundary
    const bounds = getBounds(geojson);
    if (bounds) {
        State.map.fitBounds(bounds, { padding: 60, duration: 1500 });
    }
}

function restoreBoundaryData() {
    // Re-apply boundary data after style switch (sources/layers are recreated but empty)
    const geojson = State.boundaryGeojson;
    if (!geojson) return;
    
    // Wait for sources to be available (they were re-added by addBoundaryLayers)
    const maskSource = State.map.getSource('boundary-mask');
    const lineSource = State.map.getSource('boundary-line-src');
    if (!maskSource || !lineSource) {
        console.warn('Boundary sources not found, cannot restore data');
        return;
    }
    
    // Rebuild mask and boundary data
    const worldBounds = [
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
    ];
    
    let maskCoords;
    if (geojson.type === 'Polygon') {
        maskCoords = [worldBounds, geojson.coordinates[0]];
    } else if (geojson.type === 'MultiPolygon') {
        maskCoords = [worldBounds, geojson.coordinates[0][0]];
    } else {
        return;
    }
    
    const maskFeature = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: maskCoords,
        },
    };
    
    const boundaryFeature = {
        type: 'Feature',
        geometry: geojson,
    };
    
    maskSource.setData({
        type: 'FeatureCollection',
        features: [maskFeature],
    });
    
    lineSource.setData({
        type: 'FeatureCollection',
        features: [boundaryFeature],
    });
}

function getBounds(geojson) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    
    const processCoords = (coords) => {
        if (typeof coords[0] === 'number') {
            minLng = Math.min(minLng, coords[0]);
            minLat = Math.min(minLat, coords[1]);
            maxLng = Math.max(maxLng, coords[0]);
            maxLat = Math.max(maxLat, coords[1]);
        } else {
            coords.forEach(processCoords);
        }
    };
    
    processCoords(geojson.coordinates);
    
    if (minLng === Infinity) return null;
    return [[minLng, minLat], [maxLng, maxLat]];
}

// ===== Icon Panel =====
function initIconPanel() {
    const panel = document.getElementById('left-panel');
    const toggleBtn = document.getElementById('toggle-panel');
    const closeBtn = document.getElementById('panel-close');
    const mapContainer = document.getElementById('map-container');
    
    // Start with panel open
    mapContainer.classList.add('panel-open');
    
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        mapContainer.classList.toggle('panel-open');
    });
    
    closeBtn.addEventListener('click', () => {
        panel.classList.add('collapsed');
        mapContainer.classList.remove('panel-open');
    });
    
    // Category buttons
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadIcons(btn.dataset.cat);
        });
    });
    
    // Icon search
    const searchInput = document.getElementById('icon-search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            searchIcons(query);
        } else {
            loadIcons('all');
        }
    });
    
    // Load default icons
    loadIcons('all');
}

async function loadIcons(category) {
    const grid = document.getElementById('icon-grid');
    const loading = document.getElementById('icon-loading');
    grid.innerHTML = '';
    
    let iconEntries;
    if (category === 'all') {
        // Collect all unique icons (dedupe by set:name)
        const seen = new Set();
        iconEntries = [];
        for (const cat of Object.values(ICON_COLLECTIONS)) {
            for (const entry of cat) {
                const key = `${entry.set}:${entry.name}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    iconEntries.push(entry);
                }
            }
        }
    } else {
        iconEntries = ICON_COLLECTIONS[category] || [];
    }
    
    loading.classList.remove('hidden');
    
    // Group icons by set, then fetch each set in one batch
    const bySet = {};
    for (const entry of iconEntries) {
        if (!bySet[entry.set]) bySet[entry.set] = [];
        bySet[entry.set].push(entry);
    }
    
    // Fetch all sets in parallel
    const fetchPromises = Object.entries(bySet).map(([setName, entries]) => 
        loadIconSetBatch(setName, entries, grid)
    );
    await Promise.all(fetchPromises);
    
    loading.classList.add('hidden');
}

async function loadIconSetBatch(iconSet, entries, grid) {
    const iconsParam = entries.map(e => e.name).join(',');
    
    try {
        const response = await fetch(
            `https://api.iconify.design/${iconSet}.json?icons=${iconsParam}`
        );
        if (!response.ok) {
            console.warn(`Icon set ${iconSet} fetch failed: ${response.status}`);
            return;
        }
        const data = await response.json();
        
        if (data && data.icons) {
            for (const entry of entries) {
                if (data.icons[entry.name]) {
                    const svg = buildIconSVG(data, entry.name);
                    grid.appendChild(createIconItem(svg, `${entry.set}:${entry.name}`, entry.label));
                }
            }
        }
    } catch (err) {
        console.error(`Icon load error for set ${iconSet}:`, err);
    }
}

async function searchIcons(query) {
    const grid = document.getElementById('icon-grid');
    const loading = document.getElementById('icon-loading');
    grid.innerHTML = '';
    loading.classList.remove('hidden');
    
    try {
        // Search across multiple icon sets
        const searchSets = ['maki', 'ph', 'tabler', 'icon-park-outline'];
        const searchPromises = searchSets.map(set =>
            fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=20&prefix=${set}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );
        
        const results = await Promise.all(searchPromises);
        
        // Collect all found icon names
        const foundIcons = [];
        for (let i = 0; i < results.length; i++) {
            const data = results[i];
            if (data && data.icons && data.icons.length > 0) {
                for (const fullName of data.icons) {
                    const parts = fullName.split(':');
                    if (parts.length === 2) {
                        // Try to find a Chinese label from our collections
                        let label = parts[1].replace(/-/g, ' ');
                        for (const cat of Object.values(ICON_COLLECTIONS)) {
                            const match = cat.find(e => e.set === parts[0] && e.name === parts[1]);
                            if (match) { label = match.label; break; }
                        }
                        foundIcons.push({ set: parts[0], name: parts[1], label });
                    }
                }
            }
        }
        
        if (foundIcons.length === 0) {
            grid.innerHTML = '<div class="icon-loading"><p>未找到图标</p></div>';
        } else {
            // Dedupe by set:name
            const seen = new Set();
            const unique = foundIcons.filter(e => {
                const key = `${e.set}:${e.name}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            
            // Group by set and fetch
            const bySet = {};
            for (const entry of unique) {
                if (!bySet[entry.set]) bySet[entry.set] = [];
                bySet[entry.set].push(entry);
            }
            
            const fetchPromises = Object.entries(bySet).map(([setName, entries]) =>
                loadIconSetBatch(setName, entries, grid)
            );
            await Promise.all(fetchPromises);
        }
    } catch (err) {
        console.error('Icon search error:', err);
        grid.innerHTML = '<div class="icon-loading"><p>搜索失败</p></div>';
    }
    
    loading.classList.add('hidden');
}

function buildIconSVG(data, name) {
    const icon = data.icons[name];
    const width = icon.width || data.width || 24;
    const height = icon.height || data.height || 24;
    const body = icon.body;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="24" height="24">${body}</svg>`;
}

function createIconItem(svgHTML, iconFullId, label) {
    const item = document.createElement('div');
    item.className = 'icon-item';
    item.draggable = true;
    item.dataset.icon = iconFullId;
    item.innerHTML = `
        ${svgHTML}
        <div class="icon-item-label">${label}</div>
    `;
    
    // Drag start
    item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', JSON.stringify({
            icon: iconFullId,
            svg: svgHTML,
        }));
    });
    
    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
    });
    
    return item;
}

// ===== Map Drag & Drop =====
function initMapDropZone() {
    const mapContainer = document.getElementById('map');
    
    mapContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    mapContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        
        try {
            const { icon, svg } = JSON.parse(data);
            
            // Get lng/lat from drop position
            const rect = mapContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const lngLat = State.map.unproject([x, y]);
            
            // Create marker with rough.js hand-drawn effect
            await addIconMarker(icon, svg, lngLat.lng, lngLat.lat);
            
            showToast('已添加图标', 'success');
        } catch (err) {
            console.error('Drop error:', err);
            showToast('添加失败', 'error');
        }
    });
}

// ===== Markers =====
let markerIdCounter = 0;

async function addIconMarker(iconName, svgHTML, lng, lat) {
    const id = ++markerIdCounter;
    const overlay = document.getElementById('marker-overlay');
    
    // Create container
    const markerDiv = document.createElement('div');
    markerDiv.className = 'doodle-marker';
    markerDiv.dataset.id = id;
    markerDiv.dataset.lng = lng;
    markerDiv.dataset.lat = lat;
    
    // Parse SVG and apply rough.js
    const svgSize = 32;
    const canvas = document.createElement('canvas');
    canvas.width = svgSize * 2;
    canvas.height = svgSize * 2;
    canvas.style.width = `${svgSize}px`;
    canvas.style.height = `${svgSize}px`;
    
    const ctx = canvas.getContext('2d');
    
    // Draw the icon with rough.js hand-drawn effect
    const rc = rough.canvas(canvas);
    const roughness = State.config.roughness;
    
    // Parse SVG to extract paths
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgHTML, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;
    const paths = svgEl.querySelectorAll('path, circle, rect, polygon');
    
    // Get icon color from SVG
    const accentColor = COLOR_SCHEMES[State.config.colorScheme]?.text || '#3e2723';
    
    ctx.save();
    ctx.scale(2, 2);
    ctx.translate(svgSize / 2, svgSize / 2);
    
    // Draw the icon paths scaled and centered (no circle background)
    const viewBox = svgEl.getAttribute('viewBox');
    let vbX = 0, vbY = 0, vbW = 24, vbH = 24;
    if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        vbX = parts[0]; vbY = parts[1]; vbW = parts[2] || 24; vbH = parts[3] || 24;
    }
    
    const scale = 18 / Math.max(vbW, vbH);
    const offsetX = -(vbX + vbW / 2) * scale;
    const offsetY = -(vbY + vbH / 2) * scale;
    
    paths.forEach(path => {
        const d = path.getAttribute('d');
        if (d) {
            // Draw path with rough.js
            try {
                rc.path(d, {
                    roughness: roughness,
                    stroke: accentColor,
                    strokeWidth: 1.2,
                    fill: accentColor,
                    fillStyle: 'solid',
                    fillWeight: 0.5,
                });
            } catch (e) {
                // If rough.js can't parse the path, draw it normally
                ctx.strokeStyle = accentColor;
                ctx.lineWidth = 1.2;
                ctx.fillStyle = accentColor;
                const p2d = new Path2D(d);
                ctx.fill(p2d);
                ctx.stroke(p2d);
            }
        }
    });
    
    ctx.restore();
    
    markerDiv.appendChild(canvas);
    overlay.appendChild(markerDiv);
    
    // Position marker
    updateMarkerPosition(markerDiv, lng, lat);
    
    // Click to select
    markerDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMarker(id);
    });
    
    // Make draggable
    makeMarkerDraggable(markerDiv);
    
    State.markers.push({
        id,
        type: 'icon',
        icon: iconName,
        svg: svgHTML,
        lng,
        lat,
        element: markerDiv,
        canvas,
        scale: 1,
        rotation: 0,
    });
}

function addTextMarker(text, lng, lat) {
    const id = ++markerIdCounter;
    const overlay = document.getElementById('marker-overlay');
    
    const markerDiv = document.createElement('div');
    markerDiv.className = 'doodle-text-marker';
    markerDiv.dataset.id = id;
    markerDiv.dataset.lng = lng;
    markerDiv.dataset.lat = lat;
    markerDiv.textContent = text;
    markerDiv.style.fontSize = '18px';
    markerDiv.style.fontFamily = State.config.font;
    markerDiv.style.color = COLOR_SCHEMES[State.config.colorScheme]?.text || '#3e2723';
    
    overlay.appendChild(markerDiv);
    updateMarkerPosition(markerDiv, lng, lat);
    
    markerDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        selectMarker(id);
    });
    
    makeMarkerDraggable(markerDiv);
    
    State.markers.push({
        id,
        type: 'text',
        text,
        lng,
        lat,
        element: markerDiv,
        scale: 1,
        rotation: 0,
    });
}

function updateMarkerPosition(element, lng, lat) {
    const point = State.map.project([lng, lat]);
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
}

function updateAllMarkers() {
    State.markers.forEach(marker => {
        updateMarkerPosition(marker.element, marker.lng, marker.lat);
    });
}

function makeMarkerDraggable(element) {
    let isDragging = false;
    let startX, startY, startLng, startLat;
    
    element.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const id = parseInt(element.dataset.id);
        const marker = State.markers.find(m => m.id === id);
        startLng = marker.lng;
        startLat = marker.lat;
        
        e.preventDefault();
        e.stopPropagation();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const id = parseInt(element.dataset.id);
        const marker = State.markers.find(m => m.id === id);
        if (!marker) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const startPoint = State.map.project([startLng, startLat]);
        const newPoint = [startPoint.x + dx, startPoint.y + dy];
        const newLngLat = State.map.unproject(newPoint);
        
        marker.lng = newLngLat.lng;
        marker.lat = newLngLat.lat;
        element.dataset.lng = marker.lng;
        element.dataset.lat = marker.lat;
        
        updateMarkerPosition(element, marker.lng, marker.lat);
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function selectMarker(id) {
    deselectMarker();
    const marker = State.markers.find(m => m.id === id);
    if (!marker) return;
    
    State.selectedMarker = marker;
    marker.element.classList.add('selected');
    
    // Show marker toolbar
    const toolbar = document.getElementById('marker-toolbar');
    const point = State.map.project([marker.lng, marker.lat]);
    toolbar.style.left = `${point.x + 20}px`;
    toolbar.style.top = `${point.y - 60}px`;
    toolbar.classList.remove('hidden');
}

function deselectMarker() {
    if (State.selectedMarker) {
        State.selectedMarker.element.classList.remove('selected');
        State.selectedMarker = null;
    }
    document.getElementById('marker-toolbar').classList.add('hidden');
}

function initMarkerToolbar() {
    document.getElementById('marker-scale-up').addEventListener('click', () => {
        if (State.selectedMarker) {
            State.selectedMarker.scale *= 1.2;
            applyMarkerTransform(State.selectedMarker);
        }
    });
    
    document.getElementById('marker-scale-down').addEventListener('click', () => {
        if (State.selectedMarker) {
            State.selectedMarker.scale /= 1.2;
            applyMarkerTransform(State.selectedMarker);
        }
    });
    
    document.getElementById('marker-rotate').addEventListener('click', () => {
        if (State.selectedMarker) {
            State.selectedMarker.rotation += 15;
            applyMarkerTransform(State.selectedMarker);
        }
    });
    
    document.getElementById('marker-delete').addEventListener('click', () => {
        if (State.selectedMarker) {
            deleteMarker(State.selectedMarker.id);
        }
    });
}

function applyMarkerTransform(marker) {
    if (marker.type === 'icon') {
        marker.element.style.transform = `translate(-50%, -100%) scale(${marker.scale}) rotate(${marker.rotation}deg)`;
    } else {
        marker.element.style.transform = `translate(-50%, -50%) scale(${marker.scale}) rotate(${marker.rotation}deg)`;
    }
}

function deleteMarker(id) {
    const idx = State.markers.findIndex(m => m.id === id);
    if (idx >= 0) {
        State.markers[idx].element.remove();
        State.markers.splice(idx, 1);
    }
    deselectMarker();
}

// Update markers on map move
function setupMapMoveHandler() {
    State.map.on('move', updateAllMarkers);
}

// ===== Text Annotation =====
function initTextModal() {
    const modal = document.getElementById('text-modal');
    const input = document.getElementById('text-input');
    
    // Double-click on map to add text
    State.map.on('dblclick', (e) => {
        e.preventDefault();
        const { lng, lat } = e.lngLat;
        
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        
        const confirmBtn = document.getElementById('text-confirm');
        const cancelBtn = document.getElementById('text-cancel');
        
        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        };
        
        const newConfirm = document.getElementById('text-confirm');
        const newCancel = document.getElementById('text-cancel');
        
        newConfirm.addEventListener('click', () => {
            const text = input.value.trim();
            if (text) {
                addTextMarker(text, lng, lat);
                showToast('已添加文字标注', 'success');
            }
            cleanup();
        });
        
        newCancel.addEventListener('click', cleanup);
        
        input.addEventListener('keydown', function handler(e) {
            if (e.key === 'Enter') {
                const text = input.value.trim();
                if (text) {
                    addTextMarker(text, lng, lat);
                    showToast('已添加文字标注', 'success');
                }
                cleanup();
                input.removeEventListener('keydown', handler);
            } else if (e.key === 'Escape') {
                cleanup();
                input.removeEventListener('keydown', handler);
            }
        });
    });
    
    // Disable default double-click zoom
    State.map.doubleClickZoom.disable();
}

// ===== Config Panel =====
function initConfigPanel() {
    const overlay = document.getElementById('config-overlay');
    const panel = document.getElementById('config-panel');
    const openBtn = document.getElementById('config-btn');
    const closeBtn = document.getElementById('config-close');
    const saveBtn = document.getElementById('cfg-save');
    const resetBtn = document.getElementById('cfg-reset');
    
    // Populate current config
    document.getElementById('cfg-proxy').value = State.config.proxy;
    document.getElementById('cfg-tile-url').value = State.config.tileUrl;
    document.getElementById('cfg-center-lng').value = State.config.centerLng;
    document.getElementById('cfg-center-lat').value = State.config.centerLat;
    document.getElementById('cfg-zoom').value = State.config.zoom;
    document.getElementById('cfg-zoom-val').textContent = State.config.zoom;
    document.getElementById('cfg-font').value = State.config.font;
    document.getElementById('cfg-color-scheme').value = State.config.colorScheme;
    document.getElementById('cfg-export-scale').value = State.config.exportScale;
    document.getElementById('cfg-roughness').value = State.config.roughness;
    document.getElementById('cfg-roughness-val').textContent = State.config.roughness;
    
    // Zoom slider live update
    document.getElementById('cfg-zoom').addEventListener('input', (e) => {
        document.getElementById('cfg-zoom-val').textContent = e.target.value;
    });
    
    // Roughness slider live update
    document.getElementById('cfg-roughness').addEventListener('input', (e) => {
        document.getElementById('cfg-roughness-val').textContent = e.target.value;
    });
    
    openBtn.addEventListener('click', () => {
        panel.classList.add('open');
        overlay.classList.remove('hidden');
    });
    
    const close = () => {
        panel.classList.remove('open');
        overlay.classList.add('hidden');
    };
    
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    
    saveBtn.addEventListener('click', () => {
        State.config.proxy = document.getElementById('cfg-proxy').value;
        State.config.tileUrl = document.getElementById('cfg-tile-url').value;
        State.config.centerLng = parseFloat(document.getElementById('cfg-center-lng').value) || DEFAULT_CONFIG.centerLng;
        State.config.centerLat = parseFloat(document.getElementById('cfg-center-lat').value) || DEFAULT_CONFIG.centerLat;
        State.config.zoom = parseInt(document.getElementById('cfg-zoom').value);
        State.config.font = document.getElementById('cfg-font').value;
        State.config.colorScheme = document.getElementById('cfg-color-scheme').value;
        State.config.exportScale = parseInt(document.getElementById('cfg-export-scale').value);
        State.config.roughness = parseFloat(document.getElementById('cfg-roughness').value);
        
        saveConfig();
        showToast('配置已保存', 'success');
        close();
        
        // Apply changes: rebuild map style
        showMapLoading('应用配置...');
        State.map.setStyle(buildMapStyle());
        
        let cfgStyleHandled = false;
        const handleCfgStyleReady = () => {
            if (cfgStyleHandled) return;
            cfgStyleHandled = true;
            clearTimeout(cfgTimeoutId);
            addBoundaryLayers();
            if (State.boundaryGeojson) {
                restoreBoundaryData();
            }
            hideMapLoading();
        };
        State.map.once('styledata', handleCfgStyleReady);
        const cfgTimeoutId = setTimeout(() => {
            if (!cfgStyleHandled) {
                console.warn('Config style switch timed out after 10s');
                handleCfgStyleReady();
            }
        }, 10000);
        
        // Update CSS variable for font
        document.documentElement.style.setProperty('--font-hand', `'${State.config.font}', cursive`);
    });
    
    resetBtn.addEventListener('click', () => {
        State.config = { ...DEFAULT_CONFIG };
        saveConfig();
        location.reload();
    });
}

// ===== Export =====
function initExport() {
    document.getElementById('export-btn').addEventListener('click', exportPNG);
}

async function exportPNG() {
    showToast('正在生成图片...', 'info');
    State.exportMode = true;
    
    // Hide UI elements
    const elementsToHide = [
        '#toolbar',
        '#left-panel',
        '#marker-toolbar',
        '.maplibregl-ctrl',
    ];
    
    const hiddenElements = [];
    elementsToHide.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (!el.classList.contains('hidden')) {
                el.classList.add('hidden');
                hiddenElements.push(el);
            }
        });
    });
    
    // Wait a frame for layout to settle
    await new Promise(r => requestAnimationFrame(r));
    
    try {
        const mapEl = document.getElementById('map-container');
        const scale = State.config.exportScale;
        
        const canvas = await html2canvas(mapEl, {
            useCORS: true,
            allowTaint: true,
            scale: scale,
            logging: false,
            backgroundColor: COLOR_SCHEMES[State.config.colorScheme]?.background || '#f5f0e6',
        });
        
        // Download
        const link = document.createElement('a');
        link.download = `doodlemap_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast('图片已导出！', 'success');
    } catch (err) {
        console.error('Export error:', err);
        showToast('导出失败: ' + err.message, 'error');
    } finally {
        // Restore UI
        hiddenElements.forEach(el => el.classList.remove('hidden'));
        State.exportMode = false;
    }
}

// ===== Clear All =====
function initClear() {
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (State.markers.length === 0) {
            showToast('没有标注可清除', 'info');
            return;
        }
        
        State.markers.forEach(m => m.element.remove());
        State.markers = [];
        deselectMarker();
        showToast('已清除所有标注', 'success');
    });
}

// ===== Toolbar Init =====
function initToolbar() {
    // Style switcher
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => switchStyle(btn.dataset.style));
    });
    
    initExport();
    initClear();
}

// ===== Keyboard Shortcuts =====
function initKeyboard() {
    document.addEventListener('keydown', (e) => {
        // Delete selected marker
        if ((e.key === 'Delete' || e.key === 'Backspace') && State.selectedMarker) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                deleteMarker(State.selectedMarker.id);
            }
        }
        
        // Escape deselects
        if (e.key === 'Escape') {
            deselectMarker();
        }
    });
}

// ===== UI Helpers =====
function showMapLoading(text = '加载中...') {
    const loading = document.getElementById('map-loading');
    document.getElementById('map-loading-text').textContent = text;
    loading.classList.remove('hidden');
}

function hideMapLoading() {
    document.getElementById('map-loading').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Start =====
document.addEventListener('DOMContentLoaded', () => {
    init();
    initMapDropZone();
    setupMapMoveHandler();
    // Ensure font is loaded
    document.fonts.load('16px "ZCOOL KuaiLe"').then(() => {
        console.log('Font loaded');
    }).catch(() => {
        console.warn('Font load failed, using fallback');
    });
});
