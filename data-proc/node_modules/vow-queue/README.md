vow-queue [![NPM version](https://badge.fury.io/js/vow-queue.png)](http://badge.fury.io/js/vow-queue) [![Build Status](https://secure.travis-ci.org/dfilatov/vow-queue.png)](http://travis-ci.org/dfilatov/vow-queue)
===============

vow-queue is a module for task queue with weights and priorities

Installation
------------

Module can be installed using `npm`:

```
npm install vow-queue
```

or `bower`:

```
bower install vow-queue
```

Usage
-----

````javascript
var Queue = require('vow-queue'),
    queue = new Queue({ weightLimit : 10 });
    
queue.enqueue(function() { // simple function
    return 2 * 2;
});

queue.enqueue(function() { // function returns a promise
    // do job
    return promise;
});

queue.enqueue( // task with custom priority and weight
    function() {
        // do job
    },
    {
        priority : 3, // this task will be started before the previous two
        weight   : 5
    });
    
queue.start(); // starts tasks processing

queue.enqueue(function() { }); // and enqueue yet another task
````
