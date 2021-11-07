import {actorType, identifierType, memberType} from '../block-types/types';
import {actorCategory} from '../block-categories/categories';

const block = {
    info: 'An actor which can be deployed as a smart contract',
    category: actorCategory,
    topLeft: 'actor',
    topRight: 'members',
    global: true,
    computeTitle(node, editor) {
        let {name} = editor.compilers.motoko.getInputArgs(node);
        return name && `actor ${name}`;
    },
    inputs: [{
        key: 'name',
        type: identifierType,
        optional: true,
    }, {
        key: 'members',
        type: memberType,
        multi: true,
    }],
    outputs: [{
        key: 'actor',
        type: actorType,
        toMotoko({name, members}) {
            return `actor${name ? ' ' + name : ''} { ${members.join(' ')} };`;
        },
    }],
};
export default block;