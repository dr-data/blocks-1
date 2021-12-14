import TopMenu from '../common/menus/TopMenu';
import MenuButton from '../common/menus/MenuButton';
import React, {useContext, useState} from 'react';
import MenuItem from '../common/menus/MenuItem';
import styled, {keyframes} from 'styled-components';
import classNames from 'classnames';
import EventsContext, {
    EDITOR_CHANGE_EVENT,
    EDITOR_SAVE_EVENT,
    PROJECT_CLEAR_EVENT,
    PROJECT_EXPORT_EVENT,
    PROJECT_LOAD_EVENT,
} from '../../contexts/EventsContext';
import useListener from '../../hooks/utils/useListener';
import LoadProjectModal from './LoadProjectModal';
import {Modal} from 'react-bootstrap';
import {
    CrosshairIcon,
    DownloadIcon,
    FilePlusIcon,
    FolderOpenIcon,
    FolderWideIcon,
    SaveIcon,
    SettingsIcon,
} from '../common/Icon';
import ReactTooltip from 'react-tooltip';
import AreaPlugin from 'rete-area-plugin';
import FloatingMenu from '../common/menus/FloatingMenu';
import SettingsModal from './SettingsModal';
import useOutputPanelState from '../../hooks/persistent/useOutputPanelState';
import useAutosaveState from '../../hooks/persistent/useAutosaveState';
import TutorialCard from './TutorialCard';

const BlocksLogo = styled.img`
    -webkit-user-drag: none;
    user-select: none;
    height: 40px;
`;

const ProjectNameInput = styled.input`
    border: 2px solid transparent !important;
    border-bottom: solid 2px #0003 !important;
    font-weight: bold;
    vertical-align: top;
    margin-top: .4em;
    padding: .25em .25em .1em;
    position: relative;
    background-clip: padding-box;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(30deg, #00EFFB, #8649E1, #F900E3);
        margin: -2px;
        z-index: -1;
        opacity: 0;
    }

    :focus {
        outline: none;

        &::before {
            opacity: 1;
        }
    }
`;

// TODO: define animated icons in their own files
const saveAnimation = keyframes`
    30% {
        transform: scale(.6);
    }
`;
const StyledSaveIcon = styled(SaveIcon)`
    &.animating {
        animation: ${saveAnimation} .7s ease-out;
    }
`;

// const zoomAnimation = keyframes`
//     from {
//         transform: rotate(0);
//     }
//     to {
//         transform: rotate(360deg);
//     }
// `;
const StyledZoomIcon = styled(CrosshairIcon)`
    &.animating {
        animation: ${saveAnimation} .7s ease-out;
    }
`;

// const StyledLearningIcon = styled(LearningIcon)`
//     transition: .2s transform ease-out;
//
//     &.enabled {
//         color: #333;
//         transform: scale(1.2) !important;
//     }
// `;

export default function EditorMenu({editor}) {
    const [name, setName] = useState('');
    const [saveAnimating, setSaveAnimating] = useState(false);
    const [zoomAnimating, setZoomAnimating] = useState(false);
    const [openMenu, setOpenMenu] = useState(null);
    const [outputPanel, setOutputPanel] = useOutputPanelState();
    const [autosave] = useAutosaveState();

    const events = useContext(EventsContext);

    useListener(events, EDITOR_SAVE_EVENT, () => {
        setSaveAnimating(true);
    });

    useListener(events, PROJECT_LOAD_EVENT, project => {
        setName(project.name);
        setOpenMenu(false);
    });

    /// Temp, until projectName refactor
    setTimeout(() => {
        setName(editor.projectName);
    });

    // TODO refactor
    const updateName = (name) => {
        setName(name);
        editor.projectName = name;
        events.emit(EDITOR_CHANGE_EVENT, editor);
    };

    return (
        <>
            <TopMenu>
                <MenuItem>
                    <a href="https://blocks-editor.github.io/" target="_blank" rel="noreferrer">
                        <BlocksLogo
                            className="pt-1"
                            src={`${process.env.PUBLIC_URL}/img/logo-gradient.png`}
                            alt="Blocks Logo"
                            draggable="false"
                        />
                    </a>
                </MenuItem>
                <div className="w-100 px-3">
                    <ProjectNameInput
                        type="text"
                        placeholder="Unnamed Project"
                        className="bg-light text-secondary"
                        value={name || ''}
                        onChange={e => updateName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && events.emit(EDITOR_SAVE_EVENT, editor)}
                    />
                    {!autosave && (
                        <MenuButton
                            tooltip="Save Changes"
                            onMouseDown={() => events.emit(EDITOR_SAVE_EVENT, editor)}>
                            <StyledSaveIcon
                                className={classNames(saveAnimating && 'animating')}
                                onAnimationEnd={() => setSaveAnimating(false)}
                            />
                        </MenuButton>
                    )}
                    <MenuButton
                        tooltip="Export to File"
                        onMouseDown={() => events.emit(PROJECT_EXPORT_EVENT, editor.toJSON())}>
                        <DownloadIcon/>
                    </MenuButton>
                    <MenuButton
                        tooltip="New Project"
                        onMouseDown={() => events.emit(PROJECT_CLEAR_EVENT)}>
                        <FilePlusIcon/>
                    </MenuButton>
                    <MenuButton
                        tooltip="Load Project"
                        onMouseDown={() => setOpenMenu('load')}>
                        {openMenu === 'load' ? <FolderOpenIcon/> : <FolderWideIcon/>}
                    </MenuButton>
                    <MenuButton
                        className="float-end"
                        tooltip="Settings"
                        onMouseDown={() => setOpenMenu('settings')}>
                        <SettingsIcon/>
                    </MenuButton>
                </div>
            </TopMenu>
            <FloatingMenu top left>
                <TutorialCard/>
            </FloatingMenu>
            <FloatingMenu bottom left>
                <MenuButton
                    className="round d-flex align-items-center justify-content-center"
                    tooltip="Reset Viewport"
                    onMouseDown={() => {
                        AreaPlugin.zoomAt(editor);
                        setZoomAnimating(true);
                    }}>
                    <StyledZoomIcon
                        className={classNames(zoomAnimating && 'animating')}
                        onAnimationEnd={() => setZoomAnimating(false)}
                    />
                </MenuButton>
            </FloatingMenu>
            <FloatingMenu bottom right>
                <MenuButton
                    className="compile-button text-uppercase h4 text-muted"
                    tooltip="Compile to Motoko"
                    onMouseDown={() => setOutputPanel(!outputPanel)}>
                    <small>Compile</small>
                </MenuButton>
            </FloatingMenu>
            <Modal
                show={openMenu}
                onShow={() => ReactTooltip.hide()}
                onHide={() => setOpenMenu(null)}>
                <Modal.Body>
                    {openMenu === 'load' && (
                        <LoadProjectModal/>
                    )}
                    {openMenu === 'settings' && (
                        <SettingsModal/>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}