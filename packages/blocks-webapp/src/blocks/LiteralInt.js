import {literalBlock} from '../block-patterns/literal-patterns';
import {intType} from '../block-types/types';

const block = literalBlock({
    title: 'Integer',
}, intType);
export default block;