import copy


class Memory:
    """
    A convenience class to save key/value pairs.
    """

    def __init__(self, *args, **kw):
        self.d = {}

    def __setitem__(self, key, value):
        if type(key) is not tuple:
            print('tuples')
            key = (key,)
            value = (value,)

        for i, k in enumerate(key):
            self.d[k] = value[i]

    def print(self):
        simple_contents = copy.deepcopy(self.d)
        if 'camera/image_array' in simple_contents:
            image_sum = simple_contents['camera/image_array'].sum()
            simple_contents['camera/image_array'] = 'image.sum(): '+str(image_sum)
        print(simple_contents)

    def __getitem__(self, key):
        if type(key) is tuple:
            return [self.d[k] for k in key]
        else:
            return self.d[key]

    def update(self, new_d):
        self.d.update(new_d)

    def put(self, keys, inputs):
        if len(keys) > 1:
            for i, key in enumerate(keys):
                try:
                    self.d[key] = inputs[i]
                except IndexError as e:
                    error = str(e) + ' issue with keys: ' + str(key)
                    raise IndexError(error)

        else:
            # For some baffling reason using inputs[0] for
            # consistency will break the image shown in
            # tornado
            self.d[keys[0]] = inputs

    def get(self, keys):
        result = [self.d.get(k) for k in keys]
        return result

    def keys(self):
        return self.d.keys()

    def values(self):
        return self.d.values()

    def iteritems(self):
        return self.d.iteritems()