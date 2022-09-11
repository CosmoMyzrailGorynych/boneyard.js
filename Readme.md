# Boneyard.js 💀

A dead-simple single-component UI framework for dead-simple apps. No offline compilation. Just plop a `<script>` tag into your page and you're ready to go. Pug-like templates rendered with [meatwagon.js](https://github.com/CosmoMyzrailGorynych/meatwagon.js/).

```pug
//- App.meat
h2 Hello ${state.user}!
b Counter: ${state.counter}
br
- if (state.counter < 10)
    button(data-onclick="increaseCounter") Add one
- else
    | Enough.
hr
i Not ${state.user}?
| Input your name here:
input(type="text" value="${state.user}" data-bindinput="user")
```
```html
<!-- index.html -->
<div id="theBoneyardApp"></div>
<script type="text/javascript" src="boneyard.browser.js"></script> <!-- or import it as a ESM module elsewhere -->
<script type="text/javascript">
    const target = document.getElementById('theBoneyardApp');
    const state = {
        user: 'Arthas',
        counter: 0,
        increaseCounter(evt, state) {
            state.counter++;
        }
    };
    boneyard.mount('App.meat', target, state);
</script>
```

## Binding events

Boneyard.js listens for interactions through event delegation. You can listen to specific events with these attributes:

* `data-onclick`;
* `data-onfocus`;
* `data-onblur`;
* `data-oninput`;
* `data-onchange`.

These call the functions specified in your app's state. The functions are passed with the event that triggered them and the current app's state.

```pug
//- App.meat
button(data-onclick="sayHello") Greet the user
```
```js
const state = {
    name: 'Arthas',
    sayHello(e, state) {
        alert(`Greetings, ${state.name}!`);
    }
};
boneyard.mount('App.meat', target, state);
```

### Binding input

Binding can be done with two additional attributes:

* `data-bindinput`, and
* `data-bindchange`.

Both support dot notation to write into your state objects. Remember that you must set the new values back with templating, otherwise they will be reset.

```pug
//- App.meat
label
    b Title:
    input(type="text" data-bindinput="title" value="${state.title || ''}")
label
    b Post:
    textarea(data-bindinput="post") ${state.post || ''}
hr
h1 ${state.title}
p ${state.post}
```
```js
boneyard.mount('App.meat', target);
```

## API

### `boneyard.mount(href, target, state?, onupdate?): renderer`

Fetches the meatwagon.js file by `href` and mounts it at the `target`. `state` is the object used for templating and interaction callback.

`onupdate` can have a callback that is called before every update.

Returns a function you can call to manually re-render the app.

### `boneyard.mountMeat(meat, target, state?, onupdate?): renderer`

Same as `boneyard.mount` but accepts `.meat` file contents directly.

```js
const target = document.getElementById('theBoneyardApp');
boneyard.mountMeat('b Hello, ${state.user}!', target, {
    user: 'Arthas'
});
```

## License
MIT.