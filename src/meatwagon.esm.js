const tagPattern = /^(?<tagName>[\w-]+)?(?<ids>(?:[\.#][\w-]+)*)(?:\((?<attrs>[^\n]*?)\))?(?:\s(?<text>[\s\S]+)?)?$/;
const classesPattern = /(\.[\w-]+)/g;
const idsPattern = /(#[\w-]+)/g;
const indentation = /^\s*/;
const controlOpPattern = /^((if|while|for)\s*\([\s\S]+\)|else)$/;
const countIndentation = str => indentation.exec(str)[0].length;
const atomic = ['br', 'img', 'hr', 'area', 'base', 'col', 'command', 'embed', 'input', 'link', 'meta', 'keygen', 'param', 'source', 'track', 'wbr'];

const parse = input => {
    const lines = input.split(/\r?\n/g);
    const tree = {
        type: 'root',
        children: []
    };
    const depthStack = [-1];
    const tagStack = [];
    let currContainer = tree;
    let prevNode = tree;
    const goUp = () => {
        tagStack.pop();
        depthStack.pop();
        currContainer = tagStack[tagStack.length - 1];
    };
    const goDown = (node, depth) => {
        depthStack.push(depth);
        tagStack.push(node);
        currContainer = node;
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '') {
            continue;
        }
        const lastDepth = depthStack[depthStack.length - 1];
        const newDepth = countIndentation(line);
        let newNode;
        if (trimmed[0] === '|') {
            newNode = {
                type: 'text',
                value: trimmed.slice(1).trimStart()
            };
        } else if (trimmed.startsWith('//')) {
            if (trimmed[2] === '-') {
                newNode = {
                    type: 'comment',
                    value: trimmed.slice(3)
                };
            }
        } else if (trimmed[0] === '-') {
            newNode = {
                type: 'code',
                value: trimmed.slice(1).trim(),
                children: []
            };
        } else {
            const parsed = tagPattern.exec(trimmed);
            if (!parsed) {
                throw new Error(`Line ${i + 1}: malformed tag.\n${trimmed}`);
            }
            const {tagName, ids, attrs, text} = parsed.groups;
            newNode = {
                type: 'tag',
                tagName: tagName || 'div',
                ids,
                attrs,
                hasText: Boolean(text),
                children: [],
                atomic: atomic.includes(tagName)
            };
            if (text) {
                if (newNode.atomic) {
                    throw new Error(`Line ${i + 1}: tag ${tagName} cannot have a text node.\n${trimmed}`)
                }
                newNode.children.push({
                    type: 'text',
                    value: text.trim()
                });
            }
        }
        if (newDepth < lastDepth) {
            const depthInd = depthStack.indexOf(newDepth);
            if (depthInd === -1) {
                throw new Error(`Bad indentation at line ${i + 1}, expected depth: ${depthStack.join(', ')} spaces, got ${newDepth}.\n${line}`);
            }
            while (depthStack[depthStack.length - 1] !== newDepth) {
                goUp();
            }
            currContainer.children.push(newNode);
        } else if (newDepth > lastDepth) {
            if (!('children' in currContainer)) {
                throw new Error(`Line ${i + 1}: entry of type ${currContainer.type} cannot have children.\n${line}`);
            }
            if (currContainer.type === 'tag') {
                if (atomic.includes(currContainer.tagName)) {
                    throw new Error(`Line ${i + 1}: tag ${currContainer.tagName} cannot have children.\n${line}`);
                }
                if (currContainer.hasText) {
                    throw new Error(`Line ${i + 1}: tag ${currContainer.tagName} has a text node and cannot have children.\n${line}`);
                }
            }
            goDown(prevNode, newDepth);
            currContainer.children.push(newNode);
        } else {
            currContainer.children.push(newNode);
        }
        prevNode = newNode;
    }
    return tree;
};

const escapist = /'/g;
const escapeQuotes = str => str.replace(escapist, '\\`');

const getClassesIds = ids => {
    const id = idsPattern.exec(ids)?.[0],
          classes = ids.match(classesPattern);
    let str = '';
    if (id) {
        str += ` id="${id.slice(1)}" `;
    }
    if (classes?.length) {
        str += ' class="';
        for (const c of classes) {
            str += c.slice(1) + ' ';
        }
        str = str.slice(0, -1) + '" ';
    }
    return str.slice(0, -1);
};

let isPrevNodeHtml;
const looseEnd = isHtml => {
    let output = '';
    if (isPrevNodeHtml && !isHtml) {
        output = '`;';
    } else if (!isPrevNodeHtml && isHtml) {
        output = 'html+=`';
    }
    isPrevNodeHtml = isHtml;
    return output;
};

const walk = node => {
    if (node instanceof Array) {
        return node.map(walk).join('');
    }
    let out;
    switch (node.type) {
        case 'comment':
            return `${looseEnd(true)}<!--${escapeQuotes(node.value)}-->`;
        case 'code':
            out = looseEnd(false) + node.value;
            const b = controlOpPattern.test(node.value);
            if (b) {
                out += '{';
            }
            if (node.children?.length) {
                out += walk(node.children);
            }
            if (b) {
                out += `${looseEnd(false)}}`;
            }
            isPrevNodeHtml = false;
            return out;
        case 'text':
            return `${looseEnd(true)}${escapeQuotes(node.value)}`;
        case 'tag':
            const a = node.atomic;
            let attrsString = node.attrs? (' ' + node.attrs) : '';
            if (node.ids) {
                attrsString += getClassesIds(node.ids);
            }
            out = `${looseEnd(true)}<${node.tagName}${escapeQuotes(attrsString)}${a ? '/' : ''}>`;
            if (node.children?.length) {
                out += walk(node.children);
            }
            if (!a) {
                out += `${looseEnd(true)}</${node.tagName}>`;
            }
            isPrevNodeHtml = true;
            return out;
    }
};
const makeRenderer = code => {
    try {
        return new Function('state', code);
    } catch (e) {
        console.error(code);
        throw new Error(`Malformed JS code: ${e.message}`);
    }
};
const compile = tree => {
    let output = 'let html = \'\';';
    isPrevNodeHtml = false;
    output += walk(tree.children);
    if (isPrevNodeHtml) {
        output += '`;';
    }
    output += 'return html;';
    return output;
};
var meatwagon = {
    render(input, state = {}) {
        const tree = parse(input);
        const compiled = compile(tree);
        return makeRenderer(compiled)(state);
    },
    renderer(input) {
        return makeRenderer(compile(parse(input)));
    }
};

export { meatwagon as default };
