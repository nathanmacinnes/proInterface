ProInterface
------------

Use Javascript to interact with ProPresenter.

Tested with ProPresenter 6.

To initialise:

````javascript
var pro = proInterface('127.0.0.1', 50001, 'control');
````

proInterface needs a network address (use 127.0.0.1 for the current machine), a
port number (ProPresenter's default is 50001) and a password. It'll then handle
opening and authorising the connection.

````javascript
pro.on('authReceived', function (error, controlStatus) {
  pro.on('newSlide', function (slideDetails) {
    ...
  });
  pro.getStageDisplayLayouts(function (layouts, current) {
    ...
  });
  pro.setStageDisplayLayout('Default');
});
````
