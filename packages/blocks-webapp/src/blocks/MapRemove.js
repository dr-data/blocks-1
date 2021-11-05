import {mapType, valueType} from '../block-types/types';
import {statementBlock} from '../block-patterns/statement-patterns';
import {collectionCategory} from '../block-categories/categories';
import {FaCompress} from 'react-icons/all';

const block = statementBlock({
    title: 'Remove (Map)',
    category: collectionCategory,
    icon: FaCompress,
    inputs: [{
        key: 'map',
        type: mapType,
    }, {
        key: 'key',
        type: valueType,
    }],
}, ({map, key}) => {
    return `${map}.remove(${key});`;
});
export default block;
