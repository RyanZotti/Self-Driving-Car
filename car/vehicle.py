#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sun Jun 25 10:44:24 2017
@author: wroscoe
"""

import time
from threading import Thread
from .memory import Memory
from datetime import datetime


class Vehicle():
    def __init__(self, warm_up_seconds, mem=None):

        if not mem:
            mem = Memory()
        self.mem = mem
        self.parts = []
        self.on = True
        self.threads = []
        self.warm_up_seconds = warm_up_seconds

        self.mem.put(['mode'], ['user'])

        # A brake can be applied by a user via the
        # web UI or because a part has become
        # unresponsive. The engine will stop if
        # either brake is applied.
        self.mem.put(['user-brake'], ['on'])
        self.mem.put(['latency-brake'], ['on'])

    def add(self, part, inputs=[], outputs=[],
            threaded=False, run_condition=None):
        """
        Method to add a part to the vehicle drive loop.
        Parameters
        ----------
            inputs : list
                Channel names to get from memory.
            ouputs : list
                Channel names to save to memory.
            threaded : boolean
                If a part should be run in a separate thread.
        """

        p = part
        print('Adding part {}.'.format(p.__class__.__name__))
        entry = {}
        entry['part'] = p
        entry['inputs'] = inputs
        entry['outputs'] = outputs
        entry['run_condition'] = run_condition

        # Apply brake when any part takes too long to update.
        # The most problematic part is often the prediction
        # caller because it can sometimes take awhile to get a
        # prediction. About 1-2% of the time the model has a huge
        # delay, so I stop the car so it doesn't get stuck with a
        # stale command and drive off the road. I release the brake
        # as soon as all parts are marked as responsive again
        entry['is_responsive'] = True

        if threaded:
            t = Thread(target=part.update, args=())
            t.daemon = True
            entry['thread'] = t

        self.parts.append(entry)

    def start(self, rate_hz=10, max_loop_count=None):
        """
        Start vehicle's main drive loop.
        This is the main thread of the vehicle. It starts all the new
        threads for the threaded parts then starts an infinit loop
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

            for entry in self.parts:
                if entry.get('thread'):
                    # start the update thread
                    entry.get('thread').start()

            # Wait until the parts warm up. This is needed so that parts
            # don't try to read while other parts' values prematurely.
            # For example, the web server tries to read the camera's
            # frames a second or two before the camera starts producing
            # frames and this leads to a proliferation of Open CV errors
            print('Starting vehicle...')
            # TODO: Check that all inputs/outputs are not None instead
            # TODO: of using a simple time delay
            time.sleep(self.warm_up_seconds)
            print('Vehicle started!')

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
                mode = self.mem.get(['mode'])[0]
                any_slow_parts = False
                for entry in self.parts:
                    part = entry['part']
                    if entry['is_responsive'] == False:
                        # Ignore slow model if model not being used
                        if part.name == 'ai' and mode == 'user':
                            continue
                        else:
                            # Immediately stop search if even a
                            # single slow part is discovered
                            any_slow_parts = True
                            break
                if any_slow_parts:
                    self.mem.put(['latency-brake'], 'on')
                else:
                    self.mem.put(['latency-brake'], 'off')

                self.update_parts()

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

    def get_named_part(self,name):
        for entry in self.parts:
            part = entry['part']
            if part.name == name:
                return part

    def update_parts(self):

        # Loop over all the parts
        for entry in self.parts:
            p = entry['part']

            # don't run if there is a run condition that is False
            run = True
            if entry.get('run_condition'):
                run_condition = entry.get('run_condition')
                run = self.mem.get([run_condition])[0]

            if run:
                # get inputs from memory
                inputs = self.mem.get(entry['inputs'])

                # run the part
                if entry.get('thread'):

                    # Check latency here
                    now = datetime.now()
                    if p.last_update_time is not None:
                        #print(last_update_time)
                        diff_seconds = (now - p.last_update_time).total_seconds()
                        # Latency only matters if we're using the part's output
                        # Ex: mode is AI and the model is timing out
                        mode = self.mem.get(['mode'])[0]
                        if diff_seconds > self.latency_threshold:
                            entry['is_responsive'] = False
                            message = '{part} delayed by {seconds} seconds!'
                            if p.name != 'ai':
                                print(message.format(part=p.name, seconds=diff_seconds))
                                # Force the engine to acknowledge the brake by
                                # updating the brake state to on and then sending
                                # those inputs through the engine. Note that with
                                # a real car there would be a physical brake that
                                # works independently of the engine. I have a toy
                                # car with no actual brake, so I accomplish the
                                # same thing by just telling the engine to stop
                                self.mem.put(['latency-brake'], ['on'])
                                engine_inputs = self.mem.get(entry['inputs'])
                                engine = self.get_named_part(name='engine')
                                engine.run_threaded(*engine_inputs)
                            else:
                                # Ignore ai delay if the ai isn't needed
                                if mode == 'ai':
                                    print(message.format(part=p.name, seconds=diff_seconds))
                                    engine = self.get_named_part(name='engine')
                                    engine.stop()
                        else:
                            entry['is_responsive'] = True
                    outputs = p.run_threaded(*inputs)
                else:
                    outputs = p.run(*inputs)

                # save the output to memory
                if outputs is not None:
                    self.mem.put(entry['outputs'], outputs)

    def stop(self):
        print('Shutting down vehicle and its parts...')
        for entry in self.parts:
            try:
                entry['part'].shutdown()
            except Exception as e:
                print(e)
