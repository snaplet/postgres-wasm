import time

class RateLimitingState(object):
    def __init__(self, rate, clientip, name):
        self.name = name
        self.clientip = clientip
        self.rate = rate
        self.allowance = rate
        self.last_check = time.time()

    def do_throttle(self, message):
        current = time.time()
        time_passed = current - self.last_check

        self.last_check = current
        self.allowance += time_passed * self.rate

        if self.allowance > self.rate:
            self.allowance = self.rate #throttle

        if self.allowance > 1.0:
            self.allowance -= len(message)
            return True;

        return False
