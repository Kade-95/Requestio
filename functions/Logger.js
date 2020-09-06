export function Logger() {
    const mmu = { board: undefined, previousCommands: [], index: 0, commandList: {} };

    mmu.commandList.clear = () => {
        mmu.board.innerHTML = '';
    }

    mmu.commandList.log = (data) => {
        let time = `[${kerdx.time()}]:`;
        let logItem = kerdx.createElement({
            element: 'div', attributes: { class: 'log-item' }
        });
        if(data instanceof Element){
            logItem.append(data);
        }
        else{
            try {
                logItem.innerHTML = data;
            } catch (error) {
                logItem.innerHTML = 'Error writing to the log';
            }
        }
        mmu.board.append(logItem);
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

        mmu.board = responseWindow.find('#response-window-board');
        let windowLog = responseWindow.find('#response-window-log');
        responseWindow.addEventListener('click', event => {
            if (event.target == windowLog || windowLog.isAncestor(event.target)) {
                responseWindow.find('#response-window-input').focus();
            }
        });

        let commandInput = responseWindow.find('#response-window-input');
        commandInput.addEventListener('keydown', event => {
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
                commandInput.value = value || '';
            }
            else if (event.key == 'Enter') {
                let command = commandInput.value;
                commandInput.value = '';

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
            element: 'div', children: [
                { element: 'label', text: time },
                item
            ]
        });

        mmu.commandList.log(logItem);
    }

    mmu.clean = () => {
        mmu.commandList.clear();
    }

    return mmu;
}