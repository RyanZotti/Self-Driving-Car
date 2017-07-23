from multiprocessing import Process, Queue, Event
# Got this entire script from https://hanxiao.github.io/2017/07/07/Get-10x-Speedup-in-Tensorflow-Multi-Task-Learning-using-Python-Multiprocessing/


class SingleBatchGenerator(Process):

    def __init__(self, single_task_q: Queue, stop_event: Event):
        super().__init__()
        self.done_q = single_task_q
        self.stop_event = stop_event
        self.myseed = 0

    # bucketing, padding sequences; and transforming, normalizing labelling matrix
    def next_batch(self, seed: int):
        pass

    def run(self):
        while not self.stop_event.is_set():
            if not self.done_q.full():
                self.done_q.put(self.next_batch(self.myseed))


class BatchAggregator(Process):

    def __init__(self, single_task_q: Queue, multi_task_q: Queue, stop_event: Event):
        super().__init__()
        self.pending_q = single_task_q
        self.done_q = multi_task_q
        self.stop_event = stop_event

    def run(self):
        while not self.stop_event.is_set():
            if not self.done_q.full():
                st_batch = self.pending_q.get()
                self.done_q.put(st_batch)


class MultiTaskBatchManager:

    def __init__(self):
        MAX_CAPACITY = 5
        self.stop_event = Event()
        self.single_task_q = Queue(MAX_CAPACITY)
        self.multi_task_train_q = Queue(MAX_CAPACITY)
        self.batch_aggregator = BatchAggregator(self.single_task_q, self.multi_task_train_q, self.stop_event)
        self.batch_generator = SingleBatchGenerator(self.single_task_q, self.stop_event)
        self.batch_generator.start()
        self.batch_aggregator.start()

    def next_batch(self):
        return self.multi_task_train_q.get()

    def close(self, timeout: int = 5):
        self.stop_event.set()

        self.batch_generator.join(timeout=timeout)
        self.batch_generator.terminate()

        self.batch_aggregator.join(timeout=timeout)
        self.batch_aggregator.terminate()