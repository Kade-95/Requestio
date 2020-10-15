import { System } from '../functions/System.js';
let system = new System();

export function Logger() {
    const self = { board: undefined, previousCommands: [], index: 0, commandList: {} };

    self.commandList.clear = () => {
        self.board.innerHTML = '';
    }

    self.commandList.log = (data) => {
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
        self.board.append(logItem);
    }

    self.commandList.print = (data) => {

    }

    self.commandList.request = (data) => {
        let props = self.getCommandProps(data, '-');
        if (props.url == undefined) {
            self.commandList.log('Url is required');
            return;
        }

        if (props.method == undefined) {
            self.commandList.log('Method is required');
            return;
        }

        try {
            props.data = JSON.parse(props.data);
            self.disableInput();
            self.write(`Connecting to ${props.url}`);
            system.connect(props).then(result => {
                self.write('Connected');
                self.write(result);
            }).catch(error => {
                console.log(error)
            }).finally(self.enableInput());
        } catch (error) {
            self.write('Data format not valid');
        }
    }

    self.getCommandProps = (data, start) => {
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

    self.createWindow = () => {
        let responseWindow = kerdx.createElement({
            element: 'div', attributes: { id: 'response-window' }, children: [
                {
                    element: 'span', attributes: { id: 'response-window-controls' }, children: [
                        { element: 'input', attributes: { id: 'response-window-search' } },
                        { element: 'i', attributes: { id: 'response-window-clear', class: 'fas fa-minus-circle' } },
                        { element: 'i', attributes: { id: 'response-window-toggle', class: 'fas fa-arrow-up' } },
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
        self.commandInput = responseWindow.find('#response-window-input');
        self.board = responseWindow.find('#response-window-board');
        let windowLog = responseWindow.find('#response-window-log');
        responseWindow.addEventListener('click', event => {
            if (event.target == windowLog || windowLog.isAncestor(event.target)) {
                self.commandInput.focus();
                self.commandInput.setSelectionRange(self.commandInput.value.length, self.commandInput.value.length, "forward");

            }
        });

        self.commandInput.addEventListener('keydown', event => {
            let value;
            if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {
                if (event.key == 'ArrowUp') {
                    self.index--;
                }
                else if (event.key == 'ArrowDown') {
                    self.index++;
                }

                if (self.previousCommands.length == 0) self.index = 0;
                else if (self.index < 0) self.index = 0;
                else if (self.index >= self.previousCommands.length) self.index = self.previousCommands.length - 1

                value = self.previousCommands[self.index];
                self.commandInput.value = value || '';
                self.commandInput.setSelectionRange(self.commandInput.value.length, self.commandInput.value.length, "forward");
            }
            else if (event.key == 'Enter') {
                let command = self.commandInput.value;
                self.commandInput.value = '';
                self.commandList.log(`RUN: ${command}`);
                if (command != '') {
                    self.previousCommands.push(command);
                    if (kerdx.isset(self.commandList[command.split(' ')[0]])) {
                        self.commandList[command.split(' ')[0]](command.replace(command.split(' ')[0], '').trim());
                    }
                    else {
                        self.write(`'${command.split(' ')[0]}' not found`)
                    }
                }
                else {
                    self.write(command);
                }

                self.index = self.previousCommands.length - 1;
            }
        });

        self.window = responseWindow;
        self.resize();
        return responseWindow;
    }

    self.write = (data) => {
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

        self.commandList.log(logItem);
    }

    self.clean = () => {
        self.commandList.clear();
    }

    self.disableInput = () => {
        self.commandInput.css({ display: 'none' });
    }

    self.enableInput = () => {
        self.commandInput.cssRemove(['display']);
    }

    self.resize = () => {
        self.window.onAdded(() => {
            let parent = self.window.parentNode;
            let canDrag = false;
            let position = self.window.position()
            let hover = event => {
                let diff = event.y - self.window.position().top;
                if (diff < 15 && diff > -15) {
                    self.window.css({ cursor: 'ns-resize' });
                }
                else if (!canDrag) {
                    self.window.cssRemove(['cursor']);
                }
            };

            let mousedown = event => {
                let diff = event.y - self.window.position().top;
                if (diff < 15 && diff > -15) {
                    self.window.css({ cursor: 'ns-resize' });
                    canDrag = true;
                }
            };

            let drag = event => {
                let height = position.bottom - event.y;
                let okHeight = height > 200;
                let within = event.y > parent.position().top;
                if (canDrag && within && okHeight) {
                    self.window.css({ height: `${height}px` });
                }
            };

            let mouseup = event => {
                canDrag = false;
            };

            let mouseleave = event => {
                canDrag = false;
            };

            self.window.addEventListener('mousemove', hover);
            self.window.addEventListener('mousedown', mousedown);
            parent.addEventListener('mousemove', drag);
            self.window.addEventListener('mouseup', mouseup);
            parent.addEventListener('mouseup', mouseleave);
        });
    }

    self.clear = () => {
        self.commandList.clear();
    }

    return self;
}