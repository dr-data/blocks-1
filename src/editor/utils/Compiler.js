import {getBlock} from '../blocks';
import Rete from 'rete';
import {getType} from '../../block-types/types';

export default class Compiler {
    constructor(editor, compileKey, {defaultCompile, postCompile} = {}) {
        this.editor = editor;
        this.compileKey = compileKey;
        this.defaultCompile = defaultCompile;
        this.postCompile = postCompile;
    }

    getNode(node) {
        if(node instanceof Rete.Node) {
            return node;
        }
        if(!node) {
            throw new Error(`Node cannot be ${JSON.stringify(node)}`);
        }
        let id = String(typeof node === 'string' || typeof node === 'number' ? node : node.id);
        node = this.editor.nodes.find(node => String(node.id) === id);
        if(!node) {
            throw new Error(`Node does not exist: ${id}`);
        }
        return node;
    }

    getBlock(node) {
        node = this.getNode(node);
        return getBlock(node.name);
    }

    getInput(node, key) {
        node = this.getNode(node);
        let block = this.getBlock(node);
        if(!block.props.hasOwnProperty(key)) {
            throw new Error(`Prop not found on ${node.name}: ${key}`);
        }
        let prop = block.props[key];
        if(prop.input) {
            if(!prop.type.data.reversed) {
                let input = this._input(node, key);
                if(prop.multi) {
                    return input.connections.map(c => this._compileConnection(c, c.input, c.output, 'outputs'));
                }
                if(input.connections.length) {
                    let c = input.connections[0];
                    return this._compileConnection(c, c.input, c.output, 'outputs');
                }
                if(input.control) {
                    return input.control.getValue();
                }
            }
            else {
                let output = this._output(node, key);
                if(prop.multi) {
                    return output.connections.map(c => this._compileConnection(c, c.output, c.input, 'inputs'));
                }
                if(output.connections.length) {
                    let c = output.connections[0];
                    return this._compileConnection(c, c.output, c.input, 'inputs');
                }
            }
        }

        if(prop.control) {
            let control = this._control(node, prop.key);
            return this._processOutput(control.getValue(), node, key);
        }
    }

    getOutput(node, key) {
        node = this.getNode(node);
        let prop = this._prop(node, key);
        try {
            let args = this.getInputArgs(node);
            if(!args) {
                return;
            }
            let result;
            if(this.defaultCompile) {
                result = this.defaultCompile(prop, node, key, this);
            }
            else if(prop[this.compileKey]) {
                result = prop[this.compileKey](args, node, this);
            }
            return this._processOutput(result, node, key);
        }
        catch(err) {
            console.error(`[${node.name}.${key}]`, err);
            this.editor.trigger('warn', `[${node.name}.${key}] ${err}`);
        }
    }

    getInputArgs(node) {
        node = this.getNode(node);
        let block = this.getBlock(node);
        // if(block.__inputArgs?.[this.compileKey]) {
        //     for(let key in block.__inputCache[this.compileKey]) {
        //         delete block.__inputCache[this.compileKey][key];
        //     }// TODO: proper cache invalidation
        //     return block.__inputArgs[this.compileKey];
        // }
        let args = {};
        for(let prop of Object.values(block.props)) {
            if(prop.input || prop.control) {
                // let value = this.getInput(node, prop.key);
                // if(value === undefined && !prop.optional) {
                //     this.editor.trigger('warn', `Missing input on ${block.name}: ${prop.key}`);
                //     return;
                // }
                // args[prop.key] = value;

                let cached = false;
                let cachedValue;

                Object.defineProperty(args, prop.key, {
                    get: () => {
                        // let cache = block.__inputCache[this.compileKey];
                        // if(cache.hasOwnProperty(prop.key)) {
                        //     return cache[prop.key];
                        // }
                        if(cached) {
                            return cachedValue;
                        }
                        let value = this.getInput(node, prop.key);
                        if(value === undefined && !prop.optional) {
                            this.editor.trigger('warn', `Missing input on ${block.name}: ${prop.key}`);
                            return undefined; // Appease linter
                        }
                        // cache[prop.key] = value;
                        cached = true;
                        return value;
                    },
                });
            }
        }
        if(process.env.NODE_ENV !== 'production') {
            // Throw error on missing key
            let target = args;
            args = new Proxy({}, {
                get: (_, key) => {
                    if(!target.hasOwnProperty(key)) {
                        throw new Error(`Unknown input on ${block.name}: ${key}`);
                    }
                    return target[key];
                },
            });
        }
        // TODO: refactor caching
        // [block.__inputArgs || (block.__inputArgs = {})][this.compileKey] = args;
        // [block.__inputCache || (block.__inputCache = {})][this.compileKey] = {};
        // this.editor.on('process', ()=>{
        //     for(let key in block.__inputCache) {
        //         delete block.__inputCache[key];
        //     }
        // })///
        return args;
    }

    // getControl(node, key) {
    //     node = this.getNode(node);
    //     return this._control(node, key).getValue();
    // }

    getTypeString(type) {
        // console.log('/////', type);///
        type = getType(type);
        return type?.data[this.compileKey]?.(type.generics.map(t => this.getTypeString(t)), this) || type.toTypeString();
    }

    inferType(node, key) {
        return this.editor.compilers.type.getInput(node, key);
    }

    _compileConnection(connection, from, to) {
        // let prop = this._prop(to.node, to.key);
        // if(!prop[this.compileKey]) {
        //     throw new Error(`Cannot compile property of ${from.node.name} with key: ${prop.key}`);
        // }
        return this.getOutput(to.node, to.key);
    }

    _processOutput(result, node, key) {
        return this.postCompile ? this.postCompile(result, node, key, this) : result;
    }

    _prop(node, key) {
        let block = this.getBlock(node);
        if(!block.props.hasOwnProperty(key)) {
            throw new Error(`Prop does not exist in ${node.name}: ${key}`);
        }
        return block.props[key];
    }

    _input(node, key) {
        if(!node.inputs.has(key)) {
            throw new Error(`Input not found on ${node.name}: ${key}`);
        }
        return node.inputs.get(key);
    }

    _output(node, key) {
        if(!node.outputs.has(key)) {
            throw new Error(`Output not found on ${node.name}: ${key}`);
        }
        return node.outputs.get(key);
    }

    _control(node, key) {
        if(!node.controls.has(key)) {
            throw new Error(`Control not found on ${node.name}: ${key}`);
        }
        return node.controls.get(key);
    }
}