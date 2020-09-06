const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
        this._range = null;
    }

    // setAttribute is actually storing this.props
    setAttribute(name, value) {
        this.props[name] = value;
    }

    // appendChild is actually storing this.children
    appendChild(componenet) {
        this.children.push(componenet);
    }

    get vdom() {
        return this.render().vdom;
    }

    get vchildren() {
        return this.children.map(child => child.vdom);
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        this.render()[RENDER_TO_DOM](range);
    }

    rerender() {
        // use Range object and API to avoid a bug that deleteContents won't 
        // accidentally make an empty element so that right side element shit into left 
        let oldRange = this._range;

        let range = document.createRange();
        range.setStart(oldRange.startContainer, oldRange.startOffset);
        range.setEnd(oldRange.startContainer, oldRange.startOffset);
        this[RENDER_TO_DOM](range);

        oldRange.setStart(range.endContainer, range.endOffset);
        oldRange.deleteContents();
    }

    setState(newState) {
        if (this.state === null || typeof this.state !== "object") {
            this.state = newState;
            this.rerender();
            return;
        }

        let merge = (oldState, newState) => {
            for (let p in newState) {
                if (oldState[p] === null || typeof oldState[p] !== "object") {
                    oldState[p] = newState[p];
                } else {
                    merge(oldState[p], newState[p]);
                }
            }
        }

        merge(this.state, newState);
        this.rerender();
    }
}

class ElementWrapper extends Component {
    constructor(type) {
        super(type);
        this.type = type;
        // now we have virtual DOM and we will use virtual DOM to create real DOM so
        // we don't need root anymore.
    }

    // Need to comment out setAttribute and appendChild becuase not this class extends Component 
    // We can't invoke parent class setAttribute & appendChild to print child elements
    // if we don't comment out
    // setAttribute is actually storing this.props
    /*
    setAttribute(name, value) {
        // recognize event listener
        if (name.match(/^on([\s\S]+)/)) {
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
        } else {
            if (name === "className") {
                this.root.setAttribute("class", value);
            }
            this.root.setAttribute(name, value);
        }
    }

    // appendChild is actually storing this.children
    appendChild(componenet) {
        let range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length);
        range.setEnd(this.root, this.root.childNodes.length);
        componenet[RENDER_TO_DOM](range);
    }
    */

    get vdom() {
        return this; // now elementWrapper is the vdom and contains all nodes
        /*return {
            type: this.type,
            props: this.props,
            // converting conponent children to virtual DOM children
            children: this.children.map(child => child.vdom),
        }*/
    }
    
    [RENDER_TO_DOM](range) {
        range.deleteContents();

        let root = document.createElement(this.type);

        for (const name in this.props) {
            let value = this.props[name];
            if (name.match(/^on([\s\S]+)/)) {
                root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
            } else {
                if (name === "className") {
                    root.setAttribute("class", value);
                }
                root.setAttribute(name, value);
            }
        }

        for (const child of this.children) {
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }

        range.insertNode(root);
    }
}

class TextWrapper extends Component {
    constructor(content) {
        super(content); 
        this.type = "#text";
        this.content = content;
        // create the element on the real DOM
        this.root = document.createTextNode(content);
    }

    get vdom() {
        return this; // now textWrapper is the vdom and contains all nodes
    }

    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}

export function createElement(type, attributes, ...children) {
    let e;

    if (typeof type === "string") {
        e = new ElementWrapper(type);
    } else {
        e = new type;
    }

    for (let p in attributes) {
        e.setAttribute(p, attributes[p]);
    }

    let insertChildren = (children) => {
        for(let child of children){
            if (typeof child === "string") {
                child = new TextWrapper(child);
            }
            if (child === null) {
                continue;
            }
            if ((typeof child === "object") && (child instanceof Array)) {
                insertChildren(child);
            } else {
                e.appendChild(child);
            }
            
        }
    }
    insertChildren(children);
    
    return e;
}

export function render(componenet, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    componenet[RENDER_TO_DOM](range);
}