import http.server,functools,os
d=os.path.join(os.path.dirname(os.path.abspath(__file__)),'web')
http.server.ThreadingHTTPServer(('0.0.0.0',4265),functools.partial(http.server.SimpleHTTPRequestHandler,directory=d)).serve_forever()
