from collections import OrderedDict
import time
from threading import Thread
from .Memory import Memory
from datetime import datetime


class Vehicle():
    def __init__(self, warm_up_seconds, mem=None):

        if not mem:
            mem = Memory()
        self.mem = mem
        self.parts = OrderedDict()
        self.on = True
        self.warm_up_seconds = warm_up_seconds

    def add(self, part):
        """
        Method to add a part to the vehicle drive loop.
        Parameters
        ----------
            part : Part
                The part to add
        """
        name = part.name
        print('{timestamp} -  Adding part: {part}'.format(
            part=name,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
        self.parts[name] = part

    def start(self, rate_hz=10, max_loop_count=None):
        """
        Start vehicle's main drive loop.
        This is the main thread of the vehicle. It starts all the new
        threads for the threaded parts then starts an infinite loop
        that runs each part and updates the memory.
        Parameters
        ----------
        rate_hz : int
            The max frequency that the drive loop should run. The actual
            frequency may be less than this if there are many blocking parts.
        max_loop_count : int
            Maxiumum number of loops the drive loop should execute. This is
            used for testing the all the parts of the vehicle work.
        """

        try:

            # Stop the motor if any part's latency exceeds this threshold
            self.latency_threshold = (1.0 / rate_hz) * 5

            self.on = True

            for name, part in self.parts.items():
                part.start()

            # Wait until the parts warm up. This is needed so that parts
            # don't try to read while other parts' values prematurely.
            # For example, the web server tries to read the camera's
            # frames a second or two before the camera starts producing
            # frames and this leads to a proliferation of Open CV errors
            print('{timestamp} - Starting vehicle...'.format(
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            ))
            # TODO: Check that all inputs/outputs are not None instead
            # TODO: of using a simple time delay
            time.sleep(self.warm_up_seconds)
            print('{timestamp} - Vehicle started!'.format(
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
            ))

            loop_count = 0
            while self.on:
                start_time = time.time()
                loop_count += 1

                # Make sure all parts are responding quickly
                # enough. The only exception is the prediction
                # caller which always attempts to reach the
                # model even when no model exists; in such
                # cases the prediction caller will time out
                # and show high latency but we can ignore it
                # assuming the web app says the drive mode is
                # the user
                any_slow_parts = False
                for name, part in self.parts.items():
                    if part.is_safe() == False:
                        # Immediately stop search if even a
                        # single slow part is discovered
                        any_slow_parts = True
                        break

                # Turning the brake on is mostly redundant since
                # I immediately stop the engine as soon as a bad
                # part is discovered in the update loop. What this
                # logic mostly takes care of is defining when to
                # release the brake
                if any_slow_parts:
                    self.apply_system_brake()
                    print('{timestamp} - Applied emergency brake!'.format(
                        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
                    ))
                else:
                    previous_state = self.mem.get(['vehicle/brake'])[0]
                    self.mem.put(['vehicle/brake'], False)
                    if previous_state == True:
                        print('{timestamp} - Released emergency brake!'.format(
                            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
                        ))
                self.part_loop()

                # stop drive loop if loop_count exceeds max_loopcount
                if max_loop_count and loop_count > max_loop_count:
                    self.on = False

                sleep_time = 1.0 / rate_hz - (time.time() - start_time)
                if sleep_time > 0.0:
                    time.sleep(sleep_time)

        except KeyboardInterrupt:
            pass
        finally:
            self.stop()

    # Force the engine to acknowledge the brake by
    # updating the brake state to on and then sending
    # those inputs through the engine. Note that with
    # a real car there would be a physical brake that
    # works independently of the engine. I have a toy
    # car with no actual brake, so I accomplish the
    # same thing by just telling the engine to stop
    def apply_system_brake(self):
        self.mem.put(['vehicle/brake'], True)
        engine = self.parts['engine']
        engine_inputs = self.mem.get(engine.input_names)
        engine.call(*engine_inputs)
        print('{timestamp} - Applied emergency brake!'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))

    def part_loop(self):
        for name, part in self.parts.items():
            if part.is_safe():
                if part.input_names is not None:
                    inputs = self.mem.get(part.input_names)
                    outputs = part.call(inputs)
                else:
                    outputs = part.call()
                if part.output_names is not None:
                    # Save the output(s) to memory
                    self.mem.put(part.output_names, outputs)
            else:
                part.print_latency_warning()
                self.apply_system_brake()

    def stop(self):
        print('{timestamp} - Shutting down vehicle and its parts...'.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
        ))
