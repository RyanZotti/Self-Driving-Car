from datetime import datetime
import os
import types
import functools


class Config:
    def from_pyfile(self, filename, silent=False):
        # filename = os.path.join(self.root_path, filename)
        d = types.ModuleType('config')
        d.__file__ = filename
        try:
            with open(filename, mode='rb') as config_file:
                exec(compile(config_file.read(), filename, 'exec'), d.__dict__)
        except IOError as e:
            e.strerror = 'Unable to load configuration file (%s)' % e.strerror
            raise
        self.from_object(d)
        return True

    def from_object(self, obj):
        for key in dir(obj):
            if key.isupper():
                # self[key] = getattr(obj, key)
                setattr(self, key, getattr(obj, key))

    def __str__(self):
        result = []
        for key in dir(self):
            if key.isupper():
                result.append((key, getattr(self, key)))
        return str(result)

    def parse_config_dict(self):
        result = {}
        for key in dir(self):
            if key.isupper():
                result[key] = getattr(self, key)
        return result

def load_config(config_path=None):
    if config_path is None:
        import __main__ as main
        main_path = os.path.dirname(os.path.realpath(main.__file__))
        config_path = functools.reduce(
            os.path.join, [main_path, 'templates','config_defaults.py'])
    print('{timestamp} - Loading config file: {config_path}'.format(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f"),
        config_path=config_path
    ))
    cfg = Config()
    cfg.from_pyfile(config_path)

    # Set complicated paths
    main_path = os.path.dirname(os.path.realpath(__file__))
    cfg.UI_SERVER_PATH = functools.reduce(os.path.join, [main_path,'parts','web','server','server.py'])
    cfg.AI_SERVER_PATH = functools.reduce(os.path.join, [main_path, 'parts', 'web', 'server', 'ai.py'])
    cfg.MODEL_PATH = functools.reduce(os.path.join, [main_path, 'parts', 'model'])

    print('{timestamp} - config loaded'.format(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")
    ))
    return cfg