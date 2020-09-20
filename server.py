import http.server
from http.server import HTTPServer, BaseHTTPRequestHandler, SimpleHTTPRequestHandler
import socketserver

PORT = 8080

class Handler(SimpleHTTPRequestHandler):
	def end_headers(self):
		self.send_header("Cross-Origin-Opener-Policy","same-origin")
		self.send_header("Cross-Origin-Embedder-Policy","require-corp")
		SimpleHTTPRequestHandler.end_headers(self)


Handler.extensions_map[".wasm"] = "application/wasm"
Handler.extensions_map[".wbn"] = "application/webbundle"

httpd = socketserver.TCPServer(("", PORT),Handler)

print("serving at port", PORT)
httpd.serve_forever()