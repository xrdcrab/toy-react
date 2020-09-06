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

    [RENDER_TO_DOM](range) {
        this._range = range;
        // every time we render a componenet, we need to store the old virtual DOM
        // Because we need to diff the old & new virtual DOM to update the real DOM
        this._vdom = this.vdom;
        this._vdom[RENDER_TO_DOM](range);
    }

    update() {
        let isSameNode = (oldNode, newNode) => {
            if(oldNode.type !== newNode.type) {
                return false;
            }

            for (let name in newNode.props) {
                if (newNode.props[name] !== oldNode.props[name]) {
                    return false;
                }
            }

            if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length) {
                return false;
            }

            if (newNode.type === "#text") {
                if (newNode.content !== oldNode.content) {
                    return false;
                }
            }

            return true;
        }
        let update = (oldNode, newNode) => {
            //firt copare type, then props (in real React, props can be patched) last children
            //if #text content (in real React, content can be patched )
            // in our logic, it's simple, if type and props/content is different, 
            // we cognize them complete different
            if(!isSameNode(oldNode, newNode)) {
                newNode[RENDER_TO_DOM](oldNode._range);
                return;
            }
            newNode._range = oldNode._range;

            // we need v children because new/oldNode.children are all components
            let newChildren = newNode.vchildren;
            let oldChildren = oldNode.vchildren;

            if (!newChildren || !newChildren.length) {
                return;
            }

            let tailRange = oldChildren[oldChildren.length - 1]._range;

            for (let i = 0; i < newChildren.length; i++) {
                let newChild = newChildren[i];
                let oldChild = oldChildren[i];
                if (i <oldChildren.length) {
                    update(oldChild, newChild);
                } else {
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer, tailRange.endOffset);
                    range.setEnd(tailRange.endContainer, tailRange.endOffset);
                    newChild[RENDER_TO_DOM](range);
                    tailRange = range;
                }
                
            }
        }

        let vdom = this.vdom;
        update(this._vdom, vdom);
        // done update, replace the old vdom
        this._vdom = vdom;
    }

    // Now we don't need rerender because we don't need to rerender we will partially update the DOM
    /*rerender() {
        // use Range object and API to avoid a bug that deleteContents won't 
        // accidentally make an empty element so that right side element shit into left 
        let oldRange = this._range;

        let range = document.createRange();
        range.setStart(oldRange.startContainer, oldRange.startOffset);
        range.setEnd(oldRange.startContainer, oldRange.startOffset);
        this[RENDER_TO_DOM](range);

        oldRange.setStart(range.endContainer, range.endOffset);
        oldRange.deleteContents();
    }*/

    setState(newState) {
        if (this.state === null || typeof this.state !== "object") {
            this.state = newState;
            this.update();
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
        this.update();
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
        this.vchildren = this.children.map(child => child.vdom);
        return this; // now elementWrapper is the vdom and contains all nodes
        /*return {
            type: this.type,
            props: this.props,
            // converting conponent children to virtual DOM children
            children: this.children.map(child => child.vdom),
        }*/
    }
    
    [RENDER_TO_DOM](range) {
        this._range = range;

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

        if (!this.vchildren) {
            this.vchildren = this.children.map(child => child.vdom);
        }

        for (const child of this.vchildren) {
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }

        replaceContent(range, root);
    }
}

class TextWrapper extends Component {
    constructor(content) {
        super(content); 
        this.type = "#text";
        this.content = content;
        // now we have virtual DOM and we will use virtual DOM to create real DOM so
        // we don't need root anymore.
    }

    get vdom() {
        return this; // now textWrapper is the vdom and contains all nodes
    }

    [RENDER_TO_DOM](range) {
        this._range = range;

        let root = document.createTextNode(this.content);
        replaceContent(range, root);
    }
}

function replaceContent(range, node) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();

    range.setStartBefore(node);
    range.setEndAfter(node);
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