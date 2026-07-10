#!/usr/bin/env python3
"""
DoodleMap HTTP Server — serves the map editor on port 9120
Also provides a proxy endpoint for Nominatim API (which requires a proxy from China).
"""
import http.server
import socketserver
import os
import sys
import signal
import urllib.request
import urllib.parse
import json
import ssl

PORT = int(os.environ.get('DOODLEMAP_PORT', '9120'))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Default proxy for Nominatim (can be overridden via env)
NOMINATIM_PROXY = os.environ.get('NOMINATIM_PROXY', 'http://172.17.0.1:7890')

class DoodleMapHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler with CORS headers, correct MIME types, and Nominatim proxy."""
    
    # Allow rapid restart by enabling SO_REUSEADDR before bind
    allow_reuse_address = True
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        if self.path.endswith('.ttf'):
            self.send_header('Content-Type', 'font/ttf')
        elif self.path.endswith('.woff2'):
            self.send_header('Content-Type', 'font/woff2')
        elif self.path.endswith('.css'):
            self.send_header('Content-Type', 'text/css; charset=utf-8')
        elif self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript; charset=utf-8')
        
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests — static files and API proxy."""
        
        # Nominatim proxy endpoint: /api/nominatim?osm_ids=W123&format=json&polygon_geojson=1
        if self.path.startswith('/api/nominatim'):
            self.handle_nominatim_proxy()
            return
        
        # Photon proxy endpoint (fallback if direct fails): /api/photon?q=xxx
        if self.path.startswith('/api/photon'):
            self.handle_photon_proxy()
            return
        
        # Default: serve static files
        super().do_GET()
    
    def handle_nominatim_proxy(self):
        """Proxy Nominatim requests through the configured HTTP proxy."""
        # Parse query string
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        # Build Nominatim URL
        # If 'osm_ids' is present, use the lookup API; otherwise use the search API
        nominatim_params = {}
        for key in ['osm_ids', 'format', 'polygon_geojson', 'addressdetails', 'q', 'limit']:
            if key in params:
                nominatim_params[key] = params[key][0]
        
        if 'format' not in nominatim_params:
            nominatim_params['format'] = 'json'
        if 'polygon_geojson' not in nominatim_params:
            nominatim_params['polygon_geojson'] = '1'
        
        query_string = urllib.parse.urlencode(nominatim_params)
        
        # Use lookup API for osm_ids, search API for q
        if 'osm_ids' in nominatim_params:
            nominatim_url = f"https://nominatim.openstreetmap.org/lookup?{query_string}"
        else:
            nominatim_url = f"https://nominatim.openstreetmap.org/search?{query_string}"
        
        try:
            # Create request with proper headers
            req = urllib.request.Request(nominatim_url)
            req.add_header('User-Agent', 'DoodleMap/1.0 (map editor)')
            
            # Set up proxy handler
            if NOMINATIM_PROXY:
                proxy_handler = urllib.request.ProxyHandler({
                    'http': NOMINATIM_PROXY,
                    'https': NOMINATIM_PROXY,
                })
                opener = urllib.request.build_opener(proxy_handler)
            else:
                opener = urllib.request.build_opener()
            
            # Disable SSL verification for proxy compatibility
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            https_handler = urllib.request.HTTPSHandler(context=ctx)
            
            if NOMINATIM_PROXY:
                opener = urllib.request.build_opener(proxy_handler, https_handler)
            else:
                opener = urllib.request.build_opener(https_handler)
            
            response = opener.open(req, timeout=15)
            data = response.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(data)
            
        except Exception as e:
            sys.stderr.write(f"[Nominatim proxy error] {e}\n")
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def handle_photon_proxy(self):
        """Proxy Photon geocoding requests (fallback)."""
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        photon_params = {}
        for key in ['q', 'limit', 'lang', 'lat', 'lon']:
            if key in params:
                photon_params[key] = params[key][0]
        
        if 'limit' not in photon_params:
            photon_params['limit'] = '5'
        
        query_string = urllib.parse.urlencode(photon_params)
        photon_url = f"https://photon.komoot.io/api/?{query_string}"
        
        try:
            req = urllib.request.Request(photon_url)
            req.add_header('User-Agent', 'DoodleMap/1.0')
            
            opener = urllib.request.build_opener()
            response = opener.open(req, timeout=10)
            data = response.read()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(data)
            
        except Exception as e:
            sys.stderr.write(f"[Photon proxy error] {e}\n")
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")

def main():
    os.chdir(DIRECTORY)
    
    handler = DoodleMapHandler
    httpd = socketserver.TCPServer(('0.0.0.0', PORT), handler)
    
    print(f"DoodleMap server running on http://0.0.0.0:{PORT}")
    print(f"Serving files from: {DIRECTORY}")
    print(f"Nominatim proxy: {NOMINATIM_PROXY}")
    print(f"Open http://localhost:{PORT} in your browser")
    
    def handle_signal(signum, frame):
        print(f"\nReceived signal {signum}, shutting down...")
        httpd.shutdown()
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        httpd.shutdown()

if __name__ == '__main__':
    main()
