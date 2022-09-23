import sys
import time
import threading
import logging
import traceback
import functools

from select import poll
from select import POLLIN, POLLOUT, POLLHUP, POLLERR, POLLNVAL

from pytun import TunTapDevice, IFF_TAP, IFF_NO_PI


from limiter import RateLimitingState

import tornado.ioloop
import tornado.web
import tornado.options

from tornado.concurrent import return_future

from tornado import websocket


FORMAT = '%(asctime)-15s %(message)s'
RATE = 40980.0 #unit: bytes
BROADCAST = '%s%s%s%s%s%s' % (chr(0xff),chr(0xff),chr(0xff),chr(0xff),chr(0xff),chr(0xff))
PING_INTERVAL = 30

logger = logging.getLogger('relay')


macmap = {}

@return_future
def delay_future(t, callback):
    timestamp = time.time()
    if timestamp < t:
        return
    else:
        callback(t)

class TunThread(threading.Thread):
    def __init__(self, *args, **kwargs):
        super(TunThread, self).__init__(*args, **kwargs)
        self.running = True
        self.tun = TunTapDevice(name="tap0", flags= (IFF_TAP | IFF_NO_PI))
        self.tun.addr = '10.5.0.1'
        self.tun.netmask = '255.255.0.0'
        self.tun.mtu = 1500
        self.tun.up()

    def write(self, message):
        self.tun.write(message)

    def run(self):
        p = poll()
        p.register(self.tun, POLLIN)
        try:
            while(self.running):
                #TODO: log IP headers in the future
                pollret = p.poll(1000)
                for (f,e) in pollret:
                    if f == self.tun.fileno() and (e & POLLIN):
                        buf = self.tun.read(self.tun.mtu+18) #MTU doesn't include header or CRC32
                        if len(buf):
                            mac = buf[0:6]
                            if mac == BROADCAST or (ord(mac[0]) & 0x1) == 1:
                                for socket in macmap.values():
                                    def send_message(socket):
                                        try:
                                            socket.rate_limited_downstream(str(buf))
                                        except:
                                            pass

                                    loop.add_callback(functools.partial(send_message, socket))

                            elif macmap.get(mac, False):
                                def send_message():
                                    try:
                                        macmap[mac].rate_limited_downstream(str(buf))
                                    except:
                                        pass

                                loop.add_callback(send_message)
        except:
            logger.error('closing due to tun error')
        finally:
            self.tun.close()


class MainHandler(websocket.WebSocketHandler):
    def __init__(self, *args, **kwargs):
        super(MainHandler, self).__init__(*args,**kwargs)
        self.remote_ip = self.request.headers.get('X-Forwarded-For', self.request.remote_ip)
        logger.info('%s: connected.' % self.remote_ip)
        self.thread = None
        self.mac = ''
        self.allowance = RATE #unit: messages
        self.last_check = time.time() #floating-point, e.g. usec accuracy. Unit: seconds
        self.upstream = RateLimitingState(RATE, name='upstream', clientip=self.remote_ip)
        self.downstream = RateLimitingState(RATE, name='downstream', clientip=self.remote_ip)

        ping_future = delay_future(time.time()+PING_INTERVAL, self.do_ping)
        loop.add_future(ping_future, lambda: None)

    def do_ping(self, timestamp):
        self.ping(str(timestamp))

        ping_future = delay_future(time.time()+PING_INTERVAL, self.do_ping)
        loop.add_future(ping_future, lambda: None)

    def on_pong(self, data):
        pass

    def rate_limited_downstream(self, message):
        if self.downstream.do_throttle(message):
            self.write_message(message, binary=True)

    def open(self):
        self.set_nodelay(True)

    def on_message(self, message):
        #TODO: log IP headers in the future

        #Logs which user is tied to which MAC so that we detect which user is acting maliciously
        if self.mac != message[6:12]:
            if macmap.get(self.mac, False):
                del macmap[self.mac]

            self.mac = message[6:12]
            formatted_mac = ':'.join('{0:02x}'.format(ord(a)) for a in message[6:12]) 
            logger.info('%s: using mac %s' % (self.remote_ip, formatted_mac))

            macmap[self.mac] = self

        dest = message[0:6]
        try:
            if dest == BROADCAST or (ord(dest[0]) & 0x1) == 1:
                if self.upstream.do_throttle(message):
                    for socket in macmap.values():
                        try:
                                socket.write_message(str(message),binary=True)
                        except:
                            pass

                    tunthread.write(message)
            elif macmap.get(dest, False):
                if self.upstream.do_throttle(message):
                    try:
                        macmap[dest].write_message(str(message),binary=True)
                    except:
                        pass
            else:
                if self.upstream.do_throttle(message):
                    tunthread.write(message)

        except:
            tb = traceback.format_exc()
            logger.error('%s: error on receive. Closing\n%s' % (self.remote_ip, tb))
            try:
                self.close()
            except:
                pass

    def on_close(self):
        logger.info('%s: disconnected.' % self.remote_ip)

        if self.thread is not None:
            self.thread.running = False

        try:
            del macmap[self.mac]
        except:
            pass

application = tornado.web.Application([(r'/', MainHandler)])

if __name__ == '__main__':

    tunthread = TunThread()
    tunthread.start()
 
    args = sys.argv
    tornado.options.parse_command_line(args)
    application.listen(8080)
    loop = tornado.ioloop.IOLoop.instance()
    try:
        loop.start()
    except:
        pass

    tunthread.running = False;

