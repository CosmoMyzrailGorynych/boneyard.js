import morphdom from 'morphdom';
import meatwagon from './meatwagon.esm';

const setByDot = (path = '', root, value) => {
    const parts = path.split(/(?<!\\)\./gi);
    while (parts.length > 1) {
        root = root[parts.shift()];
        if (typeof root !== 'object' && parts.length > 1) {
            return void 0;
        }
    }
    root[parts[0]] = value;
};

const delegate = (root, selector, event, callback) => {
    root.addEventListener(event, e => {
        const closest = e.target.closest(selector);
        if (!closest) return;
        callback.apply(closest, [e]);
    });
};

const mountMeat = (meat, target, state = {}, onupdate) => {
    const renderer = meatwagon.renderer(meat);
    const render = () => {
        if (onupdate) {
            onupdate(state);
        }
        morphdom(target, `<div>${renderer(state)}</div>`, {childrenOnly: true});
    };
    const genericHandler = attr => e => {
        const callKey = e.target.getAttribute(attr);
        if (!(callKey in state)) {
            console.warn('[boneyard.js] Dumping current state:', state);
            throw new Error(`[boneyard.js] Missing event "${callKey}".`);
        } else {
            state[callKey](e, state);
            render();
        }
    };
    const inputHandler = attr => e => {
        const stateKey = e.target.getAttribute(attr);
        const bool = ['checkbox', 'radio'].includes(e.target.getAttribute('type'));
        const number = bool && ['number', 'slider'].includes(e.target.getAttribute('type'));
        let val = bool ? e.target.checked : e.target.value;
        if (number) {
            val = Number(val);
        }
        setByDot(stateKey, state, val);
        render();
    };
    delegate(target, '[data-onclick]', 'click', genericHandler('data-onclick'));
    delegate(target, '[data-onfocus]', 'focus', genericHandler('data-onfocus'));
    delegate(target, '[data-onblur]', 'blur', genericHandler('data-onblur'));
    delegate(target, '[data-oninput]', 'input', genericHandler('data-oninput'));
    delegate(target, '[data-onchange]', 'change', genericHandler('data-onchange'));
    delegate(target, '[data-bindinput]', 'input', inputHandler('data-bindinput'));
    delegate(target, '[data-bindchange]', 'change', inputHandler('data-bindchange'));
    render();
    return render;
};

export default {
    async mount(src, target, state = {}, onupdate) {
        const meat = await fetch(src).then(response => response.text());
        return mountMeat(meat, target, state, onupdate);
    },
    mountMeat
}