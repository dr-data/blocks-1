import Editor from './Editor';
import React, {useCallback, useContext} from 'react';
import useListener from '../../hooks/utils/useListener';
import EventsContext, {
    PROJECT_CLEAR_EVENT,
    PROJECT_EXPORT_EVENT,
    PROJECT_LOAD_EVENT,
} from '../../contexts/EventsContext';
import FileSaver from 'file-saver';
import {pascalCase} from 'change-case';
import useRedraw from '../../hooks/utils/useRedraw';
import isEmbedded from '../../utils/isEmbedded';
import {parse} from 'querystring';
import {EDITOR_STORE} from '../../observables/editorStore';
import {EDITOR_STATE_STORE} from '../../observables/editorStateStore';
import {UndoRedoHistory} from '../../plugins/rete-blocks-history-plugin';

const STORAGE_EDITOR_STATE = 'blocks.editorState';

const DEFAULT_STATE = require('../../examples/files/DefaultProject.json');

const embedded = isEmbedded();
const storage = embedded ? {} : localStorage; // TODO: convert to `useLocalStorage()`

if(embedded) {
    console.log('Blocks: using embedded mode.');
}

const history = new UndoRedoHistory(50);

let nextEditorState;

export default function EditorPage() {
    const redraw = useRedraw();

    const {menu: menuParam} = parse(window.location.search.substring(1));

    const events = useContext(EventsContext);

    useListener(events, PROJECT_CLEAR_EVENT, () => {
        // TODO: confirmation modal
        // delete storage[STORAGE_EDITOR_STATE];
        nextEditorState = DEFAULT_STATE;
        redraw();
    });

    useListener(events, PROJECT_LOAD_EVENT, state => {
        // storage[STORAGE_EDITOR_STATE] = JSON.stringify(state);
        nextEditorState = state;///
        redraw();
    });

    useListener(events, PROJECT_EXPORT_EVENT, state => {
        const data = JSON.stringify(state);
        FileSaver.saveAs(new Blob([data]), `${pascalCase(state.name || 'project')}.blocks`);
    });

    useListener(window, 'message', ({source, data}) => {
        if(embedded && source === window.parent) {
            if(typeof data === 'string' && data.startsWith('{')) {
                console.log('Received message:', data);
                data = JSON.parse(data);
                if(data?.type === 'load') {
                    nextEditorState = data.state ? JSON.parse(JSON.stringify(data.state)) : DEFAULT_STATE;
                    redraw();
                }
            }
        }
    });

    const sendMessage = (message) => {
        if(embedded) {
            console.log('Sending message:', message);
            const targetOrigin = '*'; // TODO: restrict target origin
            window.parent.postMessage(message, targetOrigin);
        }
    };

    const onEditorSetup = useCallback(async (loadState, editor) => {
        const stateString = nextEditorState ? JSON.stringify(nextEditorState) : storage[STORAGE_EDITOR_STATE];
        nextEditorState = null;

        let state;
        if(stateString) {
            state = JSON.parse(stateString);
        }
        else if(!embedded) {
            state = DEFAULT_STATE;
        }

        if(state && !await loadState(state)) {
            console.warn('Load error');
        }
    }, []);

    // let previousState = {};
    const onEditorChange = useCallback((editor) => {
        const state = editor.toJSON();
        // const patch = compare(previousState, state);
        // previousState = state;
        // console.log('Patch:', patch);///

        editor.trigger('history', state);

        EDITOR_STATE_STORE.set(state);
        // UNSAVED_CHANGES_STORE.set(true);
    }, []);

    const onEditorSave = useCallback((state, editor) => {
        // console.log('Saving:', state);
        const stateString = JSON.stringify(state);
        storage[STORAGE_EDITOR_STATE] = stateString;
        sendMessage({
            type: 'save',
            state: stateString,
        });
        // UNSAVED_CHANGES_STORE.set(false);
    }, []);

    return (
        <Editor
            observable={EDITOR_STORE}
            hideMenu={menuParam === 'hidden'}
            onSetup={onEditorSetup}
            onChange={onEditorChange}
            onSave={onEditorSave}
            history={history}
        />
    );
}