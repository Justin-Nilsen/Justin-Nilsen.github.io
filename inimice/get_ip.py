#!/usr/bin/env python

import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler


def get_ip_address():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    return s.getsockname()[0]

if __name__ == "__main__":
    full_command = 'python3 -m http.server 8080 --bind ' + get_ip_address()
    print(full_command)
    
#httpd = HTTPServer((str(get_ip_address()), 8080), SimpleHTTPRequestHandler)
#httpd.serve_forever()