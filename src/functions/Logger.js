import { System } from '../functions/System.js';
let system = new System();

export function Logger() {
    const mmu = { board: undefined, previousCommands: [], index: 0, commandList: {} };

    mmu.commandList.clear = () => {
        mmu.board.innerHTML = '';
    }

    mmu.commandList.log = (data) => {
        let logItem = kerdx.createElement({
            element: 'div', attributes: { class: 'log-item' }
        });
        if (data instanceof Element) {
            logItem.append(data);
        }
        else {
            try {
                logItem.innerHTML = data;
            } catch (error) {
                logItem.innerHTML = 'Error writing to the log';
            }
        }
        mmu.board.append(logItem);
    }

    mmu.commandList.print = (data) => {

    }

    mmu.commandList.request = (data) => {
        let props = mmu.getCommandProps(data, '-');
        if (props.url == undefined) {
            mmu.commandList.log('Url is required');
            return;
        }

        if (props.method == undefined) {
            mmu.commandList.log('Method is required');
            return;
        }

        try {
            props.data = JSON.parse(props.data);
            mmu.disableInput();
            mmu.write(`Connecting to ${props.url}`);
            system.connect(props).then(result => {
                mmu.write('Connected');
                mmu.write(result);
            }).catch(error => {
                console.log(error)
            }).finally(mmu.enableInput());
        } catch (error) {
            mmu.write('Data format not valid');
        }
    }

    mmu.getCommandProps = (data, start) => {
        let commands = {};
        let args = data.split(' ');
        let arg;
        for (let i = 0; i < args.length; i++) {
            arg = args[i];
            if (arg[0] == start) {
                commands[arg.replace(start, '')] = args[i + 1];
            }
        }

        return commands;
    }

    mmu.createWindow = () => {
        let responseWindow = kerdx.createElement({
            element: 'div', attributes: { id: 'response-window' }, children: [
                {
                    element: 'span', attributes: { id: 'response-window-controls' }, children: [
                        { element: 'input', attributes: { id: 'response-window-search' } },
                        { element: 'i', attributes: { id: 'response-window-toggle', class: 'fas fa-arrow-up' } },
                        { element: 'i', attributes: { id: 'response-window-clear', class: 'fas fa-trash' } }
                    ]
                },
                {
                    element: 'span', attributes: { id: 'response-window-log' }, children: [
                        { element: 'span', attributes: { id: 'response-window-board' } },
                        {
                            element: 'span', attributes: { id: 'response-window-command' }, children: [
                                { element: 'label', text: 'RUN: ' },
                                { element: 'input', attributes: { id: 'response-window-input', autoComplete: 'off' } }
                            ]
                        }
                    ]
                }
            ]
        });
        mmu.commandInput = responseWindow.find('#response-window-input');
        mmu.board = responseWindow.find('#response-window-board');
        let windowLog = responseWindow.find('#response-window-log');
        responseWindow.addEventListener('click', event => {
            if (event.target == windowLog || windowLog.isAncestor(event.target)) {
                mmu.commandInput.focus();
                mmu.commandInput.setSelectionRange(mmu.commandInput.value.length, mmu.commandInput.value.length, "forward");

            }
        });

        mmu.commandInput.addEventListener('keydown', event => {
            let value;
            if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
                if (event.key == 'ArrowUp') {
                    mmu.index--;
                }
                else if (event.key == 'ArrowDown') {
                    mmu.index++;
                }

                if (mmu.previousCommands.length == 0) mmu.index = 0;
                else if (mmu.index < 0) mmu.index = 0;
                else if (mmu.index >= mmu.previousCommands.length) mmu.index = mmu.previousCommands.length - 1

                value = mmu.previousCommands[mmu.index];
                mmu.commandInput.value = value || '';
                mmu.commandInput.setSelectionRange(mmu.commandInput.value.length, mmu.commandInput.value.length, "forward");
            }
            else if (event.key == 'Enter') {
                let command = mmu.commandInput.value;
                mmu.commandInput.value = '';
                mmu.commandList.log(`RUN: ${command}`);
                if (command != '') {
                    mmu.previousCommands.push(command);
                    if (kerdx.isset(mmu.commandList[command.split(' ')[0]])) {
                        mmu.commandList[command.split(' ')[0]](command.replace(command.split(' ')[0], '').trim());
                    }
                    else {
                        mmu.write(`'${command.split(' ')[0]}' not found`)
                    }
                }
                else {
                    mmu.write(command);
                }

                mmu.index = mmu.previousCommands.length - 1;
            }
        });

        mmu.window = responseWindow;
        mmu.resize();
        return responseWindow;
    }

    mmu.write = (data) => {
        let item;
        if (data instanceof Element) {
            item = data;
        }
        else if (typeof data == 'object') {
            item = kerdx.displayData(data);
        }
        else {
            item = kerdx.createElement({ element: 'span', html: data });
        }

        let time = `[${kerdx.time()}]:`;
        let logItem = kerdx.createElement({
            element: 'div', attributes: { style: { display: 'grid', gridTemplateColumns: 'max-content 1fr' } }, children: [
                { element: 'label', text: time },
                item
            ]
        });

        mmu.commandList.log(logItem);
    }

    mmu.clean = () => {
        mmu.commandList.clear();
    }

    mmu.disableInput = () => {
        mmu.commandInput.css({ display: 'none' });
    }

    mmu.enableInput = () => {
        mmu.commandInput.cssRemove(['display']);
    }

    mmu.resize = () => {
        mmu.window.onAdded(() => {
            let parent = mmu.window.parentNode;
            let canDrag = false;
            let position = mmu.window.position()
            let hover = event => {
                let diff = event.y - mmu.window.position().top;
                if (diff < 15 && diff > -15) {
                    mmu.window.css({ cursor: 'ns-resize' });
                }
                else if (!canDrag) {
                    mmu.window.cssRemove(['cursor']);
                }
            };

            let mousedown = event => {
                let diff = event.y - mmu.window.position().top;
                if (diff < 15 && diff > -15) {
                    mmu.window.css({ cursor: 'ns-resize' });
                    canDrag = true;
                }
            };

            let drag = event => {
                let height = position.bottom - event.y;
                let okHeight = height > 200;
                let within = event.y > parent.position().top;
                if (canDrag && within && okHeight) {
                    mmu.window.css({ height: `${height}px` });
                }
            };

            let mouseup = event => {
                canDrag = false;
            };

            let mouseleave = event => {
                canDrag = false;
            };

            mmu.window.addEventListener('mousemove', hover);
            mmu.window.addEventListener('mousedown', mousedown);
            parent.addEventListener('mousemove', drag);
            mmu.window.addEventListener('mouseup', mouseup);
            parent.addEventListener('mouseup', mouseleave);
        });
    }

    return mmu;
}