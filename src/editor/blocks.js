import {basename} from 'path';

const allBlocks = [];
const blockNames = new Set();
// noinspection JSUnresolvedFunction
const blockContext = require.context('../blocks', true, /\.js$/);
blockContext.keys().forEach(path => {
    let name = basename(path, '.js');
    let block = blockContext(path).default;
    if(block) {
        block.name = name;
        if(blockNames.has(name)) {
            console.error(`Duplicate block name: ${name}`);
            return;
        }
        if(block.props) {
            block.inputs = block.inputs || [];
            block.outputs = block.outputs || [];
            block.controls = block.controls || [];
            for(let [key, prop] of Object.entries(block.props)) {
                prop.key = key;
                // `output` prioritized over `input`
                if(prop.output) {
                    block.outputs.push(prop);
                }
                else if(prop.input) {
                    block.inputs.push(prop);
                }
                else if(prop.control) {
                    block.controls.push(prop);
                }
            }
        }
        else {
            block.props = {};
            // `outputs` prioritized over `inputs`
            addProps(block, block.outputs, 'output');
            addProps(block, block.inputs, 'input');
            addProps(block, block.controls, 'control');
        }
        blockNames.add(block.name);
        allBlocks.push(block);
    }
});

function addProps(block, propList, type) {
    if(propList) {
        for(let prop of propList) {
            if(prop.key && block.props[prop.key] === prop) {
                continue;
            }
            if(block.props.hasOwnProperty(prop.key)) {
                throw new Error(`Duplicate prop in ${block.name}: ${prop.key}`);
            }
            prop[type] = prop[type] || true;
            block.props[prop.key] = prop;
        }
    }
}

export const BLOCK_MAP = new Map(allBlocks.map(block => [block.name, block]));