import { System } from '../functions/System.js';
let system = new System();

export function Logger() {
    const self = { board: undefined, previousCommands: [], index: 0, commandList: {}, height: '', width: '' };

    self.commandList.clear = () => {//clear the log
        self.board.innerHTML = '';
    }

    self.commandList.log = (data) => {//log an output
        let logAction = base.createElement({
            element: 'div', attributes: { class: 'log-action' }
        });

        if (data instanceof Element) {//is an element?
            logAction.append(data);
        }
        else {//add to log
            try {
                logAction.innerHTML = data;
            } catch (error) {
                logAction.innerHTML = 'Error writing to the log';
            }
        }
        self.board.append(logAction);
    }

    self.commandList.error = (data) => {//log an error

    }

    self.commandList.request = (data) => {//perform a request
        let props = self.getCommandProps(data, '-');
        if (props.url == undefined) {//check for url
            self.commandList.log('Url is required');
            return;
        }

        if (props.method == undefined) {//check for method
            self.commandList.log('Method is required');
            return;
        }

        try {//prepare request
            props.data = JSON.parse(props.data);
            self.disableInput();//disable inputs
            self.write(`Connecting to ${props.url}`);

            system.connect(props)
                .then(result => {//send request and log
                    self.write('Connected');
                    self.write(result);
                })
                .catch(error => {
                    self.write(error);
                })
                .finally(self.enableInput());//enable input
        } catch (error) {
            self.write('Data format not valid');
        }
    }

    self.getCommandProps = (data, start) => {//get the cli command parameters
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

    self.createWindow = () => {//create the cli
        let responseWindow = base.createElement({
            element: 'div', attributes: { id: 'response-window' }, children: [
                {
                    element: 'span', attributes: { id: 'response-window-controls' }, children: [
                        { element: 'input', attributes: { id: 'response-window-search' } },
                        { element: 'i', attributes: { id: 'response-window-clear', class: 'response-window-icon fas fa-minus-circle' } },
                        { element: 'i', attributes: { id: 'response-window-toggle', class: 'response-window-icon', 'data-icon': 'fas,fa-angle-left' } },
                        { element: 'i', attributes: { id: 'response-window-options', class: 'response-window-icon fas fa-ellipsis-v' } },
                    ]
                },
                {
                    element: 'span', attributes: { id: 'response-window-log' }, children: [
                        { element: 'span', attributes: { id: 'response-window-board' } },
                        {
                            element: 'span', attributes: { id: 'response-window-command' }, children: [
                                { element: 'i', attributes: { class: 'fas fa-angle-right' } },
                                { element: 'input', attributes: { id: 'response-window-input', autoComplete: 'off' } }
                            ]
                        }
                    ]
                }
            ]
        });

        self.window = responseWindow;
        self.commandInput = self.window.find('#response-window-input');
        self.board = self.window.find('#response-window-board');
        self.windowLog = self.window.find('#response-window-log');
        self.responseWindowClear = self.window.find('#response-window-clear');
        self.responseWindowToggle = self.window.find('#response-window-toggle');
        self.responseWindowOptions = self.window.find('#response-window-options');

        self.window.addEventListener('click', event => {
            if (event.target == self.windowLog || self.windowLog.isAncestor(event.target)) {
                self.commandInput.focus();
                self.commandInput.setSelectionRange(self.commandInput.value.length, self.commandInput.value.length, "forward");
            }
        });

        self.responseWindowToggle.addEventListener('click', event => {
            self.window.toggleClass('response-window-full');
            self.shapeShift();
        });

        self.responseWindowClear.addEventListener('click', event => {
            self.clear();
        });

        self.responseWindowOptions.addEventListener('click', event => {
            self.window.find('#response-window-log').toggleChild(self.getOptionsWindow());
        });

        self.resize();
        self.handleInputs();
        return responseWindow;
    }

    self.handleInputs = () => {
        self.commandInput.addEventListener('keydown', event => {//listen to keyboard
            let value;
            if (event.key == 'ArrowUp' || event.key == 'ArrowDown') {//navigate previous commands
                if (event.key == 'ArrowUp') {
                    self.index--;
                }
                else if (event.key == 'ArrowDown') {
                    self.index++;
                }

                //restrict to bounds
                if (self.previousCommands.length == 0) {
                    self.index = 0;//is empty then index is 0
                }
                else if (self.index < 0) {
                    self.index = 0;//navigated below scope 0 bring back to 0
                }
                else if (self.index >= self.previousCommands.length) {
                    self.index = self.previousCommands.length - 1;//navigated above list, point to the last
                }

                value = self.previousCommands[self.index];
                self.commandInput.value = value || '';
                self.commandInput.setSelectionRange(self.commandInput.value.length, self.commandInput.value.length, "forward");
            }
            else if (event.key == 'Enter') {//execute the current command
                let command = self.commandInput.value;
                self.commandInput.value = '';
                self.commandList.log(base.createElement({
                    element: 'span', attributes: { style: { display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '.5em' } }, children: [
                        { element: 'i', attributes: { class: 'fas fa-angle-right' } },
                        { element: 'a', text: command }
                    ]
                }));
                if (command != '') {//avoid empty commands
                    self.previousCommands.push(command);
                    if (base.isset(self.commandList[command.split(' ')[0]])) {//is command in commandlist
                        self.commandList[command.split(' ')[0]](command.replace(command.split(' ')[0], '').trim());
                    }
                    else {
                        self.write(`'${command.split(' ')[0]}' not found`);
                    }
                }
                else {
                    self.write(command);
                }

                self.index = self.previousCommands.length - 1;//register index
            }
        });
    }

    self.shapeShift = () => {
        self.responseWindowToggle.removeClasses(self.responseWindowToggle.dataset.icon);

        if (self.window.classList.contains('response-window-full')) {// on fullwindow
            if (self.window.parentNode.classList.contains('dock-down')) {// and on the side
                self.responseWindowToggle.dataset.icon = 'fas,fa-angle-down';
            }
            else if (self.window.parentNode.classList.contains('dock-side')) {
                self.responseWindowToggle.dataset.icon = 'fas,fa-angle-right';
            }
            self.window.cssRemove(['height', 'width']);
        }
        else {
            if (self.window.parentNode.classList.contains('dock-down')) {
                self.window.cssRemove(['width']);
                self.window.css({ height: self.height });

                self.responseWindowToggle.dataset.icon = 'fas,fa-angle-up';
            }
            else if (self.window.parentNode.classList.contains('dock-side')) {
                self.window.cssRemove(['height']);
                self.window.css({ width: self.width });

                self.responseWindowToggle.dataset.icon = 'fas,fa-angle-left';
            }
        }

        self.responseWindowToggle.addClasses(self.responseWindowToggle.dataset.icon);
    }

    self.write = (data) => {//log an unprepared output
        let item;
        if (data instanceof Element) {
            item = data;
        }
        else if (typeof data == 'object') {
            item = base.displayData(data);//prepare object
        }
        else {
            item = base.createElement({ element: 'span', html: data });//turn to an element
        }

        let time = `[${base.time()}]:`;
        let logResult = base.createElement({
            element: 'div', attributes: { class: 'log-result' }, children: [
                { element: 'label', text: time },
                item
            ]
        });

        self.commandList.log(logResult);//log it
    }

    self.clean = () => {//clear screen
        self.commandList.clear();
    }

    self.disableInput = () => {
        self.commandInput.css({ display: 'none' });//disable input while running a command
    }

    self.enableInput = () => {
        self.commandInput.cssRemove(['display']);//re-enamble the input when command is done
    }

    self.resize = () => {
        let resizeHeight = () => {
            let parent = self.window.parentNode;
            let canDrag = false;
            let position = self.window.position();

            let hover = event => {//monitor hovering mouse
                if (self.window.parentNode.classList.contains('dock-side')) {
                    return;
                }

                let diff = event.y - self.window.position().top;
                if (diff < 20 && diff > -20) {
                    self.window.css({ cursor: 'ns-resize' });
                }
                else if (!canDrag) {
                    self.window.cssRemove(['cursor']);
                }
            };

            let mousedown = event => {//try enabling drag
                if (self.window.classList.contains('dock-side')) {
                    return;
                }

                let diff = event.y - self.window.position().top;
                if (diff < 20 && diff > -20) {
                    self.window.css({ cursor: 'ns-resize' });
                    canDrag = true;
                }
            };

            let drag = event => {//resize height if within bounds and restricted height
                if (!canDrag) return;

                let height = position.bottom - event.y;
                let okHeight = height > 240;
                let within = event.y > parent.position().top;
                if (canDrag && within && okHeight) {
                    self.window.css({ height: `${height}px` });

                    if (height > 250) {
                        self.window.css({ position: 'absolute' });
                    }
                    else {
                        self.window.cssRemove(['position']);
                    }
                    self.height = `${height}px`;
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
        }

        let resizeWidth = () => {
            let parent = self.window.parentNode;
            let canDrag = false;
            let position = self.window.position();

            let hover = event => {//monitor hovering mouse
                if (self.window.parentNode.classList.contains('dock-down')) {
                    return;
                }

                let diff = event.x - self.window.position().left;
                if (diff < 20 && diff > -20) {
                    self.window.css({ cursor: 'ew-resize' });
                }
                else if (!canDrag) {
                    self.window.cssRemove(['cursor']);
                }
            };

            let mousedown = event => {
                if (self.window.classList.contains('dock-down')) {
                    return;
                }
                let diff = event.x - self.window.position().left;
                if (diff < 30 && diff > -30) {
                    self.window.css({ cursor: 'ew-resize' });
                    canDrag = true;
                }
            };

            let drag = event => {
                if (!canDrag) return;

                let width = position.right - event.x;
                let okWidth = width > 330;
                let within = event.x > parent.position().left;

                if (canDrag && within && okWidth) {
                    self.window.css({ width: `${width}px` });

                    if (width > 360) {
                        self.window.css({ position: 'absolute' });
                    }
                    else {
                        self.window.cssRemove(['position']);
                    }

                    self.width = `${width}px`;
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
        }

        self.window.onAdded(() => {
            resizeHeight();
            resizeWidth();
        });
    }

    self.clear = () => {//remove all logs
        self.commandList.clear();
    }

    self.getOptionsWindow = () => {
        if (self.optionsWindow == undefined) {
            self.optionsWindow = base.createElement({
                element: 'div', attributes: { id: 'response-window-options-pane' }, children: [
                    {
                        element: 'span', attributes: { class: 'response-window-options-pane-section', id: 'section-A' }, children: [
                            { element: 'a', text: 'Dock Side' },
                            {
                                element: 'span', attributes: { id: 'dock-options' }, children: [
                                    { element: 'i', attributes: { id: 'dock-button', class: 'dock-options-icon far fa-window-maximize fa-rotate-90' } }
                                ]
                            }
                        ]
                    }
                ]
            });

            self.optionsWindow.addEventListener('click', event => {//change the dock
                if (event.target.classList.contains('dock-options-icon')) {
                    self.window.parentNode.toggleClass('dock-down');
                    self.window.parentNode.toggleClass('dock-side');
                    event.target.toggleClass('fa-rotate-90');
                    event.target.toggleClass('fa-rotate-180');

                    self.shapeShift();
                }
            });

            self.optionsWindow.notBubbledEvent('click', event => {//is another element clicked(remove me)
                if (self.optionsWindow.added) {
                    self.optionsWindow.remove();
                    self.optionsWindow.added = false;
                }
            });
        }

        self.optionsWindow.onAdded(done => {//notify that I have been added to the window
            let timeOut = setTimeout(() => {
                self.optionsWindow.added = true;
                clearTimeout(timeOut);
            }, 1000);
        });

        return self.optionsWindow;
    }

    return self;
}