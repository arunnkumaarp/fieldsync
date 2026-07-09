// A free, no-API-key-required MapLibre style so the map works out of the box.
// Swap in a Mapbox/MapTiler/Google style URL via NEXT_PUBLIC_MAP_STYLE_URL if
// you have a key and want richer tiles.
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';
