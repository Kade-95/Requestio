const { Base, AppLibrary, Compression} = require('kedio/browser');
window.kerdx = new Base(window);
const { Logger } = require('./functions/Logger.js');
const { System } = require('./functions/System.js');

window.mmu = {};
window.compressor = Compression();
window.appLibrary = AppLibrary();
let logger = new Logger();
let system = new System();

mmu.generateRequestContent = (params = { name: '', options: [] }) => {
    let label = kerdx.camelCasedToText(params.name);
    let nodeName = 'input';

    if (Array.isArray(params.options)) {
        nodeName = 'select';
    }

    let content = kerdx.createElement({
        element: 'div', attributes: { class: 'request-window-content' }, children: [
            { element: 'label', attributes: { class: 'request-window-content-label', id: name }, text: label },
            { element: nodeName, attributes: { class: 'request-window-content-data', name: params.name } },
        ]
    });

    if (Array.isArray(params.options)) {
        content.find('.request-window-content-data').makeElement({
            element: 'option', attributes: { selected: true, disabled: true, value: null }, text: `Select ${label}`
        });

        for (let option of params.options) {
            content.find('.request-window-content-data').makeElement({
                element: 'option', attributes: { value: option }, text: option
            });
        }
    }

    return content;
}

mmu.generateData = () => {
    let data = kerdx.createElement({
        element: 'div', attributes: { class: 'request-single-data' }, children: [
            { element: 'input', attributes: { class: 'request-single-data-name', placeHolder: 'Name' } },
            { element: 'label', text: '=>' },
            { element: 'input', attributes: { class: 'request-single-data-value', placeHolder: 'Value' } },
            { element: 'select', attributes: { class: 'request-single-data-type' }, options: ['String', 'Array', 'Json'] },
            { element: 'i', attributes: { class: 'request-single-data-remove fas fa-trash' } }
        ]
    });

    return data;
}

mmu.validateRequest = () => {
    let requestContents = document.body.find('#request-contents');
    let validateForm = kerdx.validateForm(requestContents);
    if (!validateForm.flag) {
        logger.write(`${kerdx.camelCasedToText(validateForm.elementName)} is required`);
        return false;
    }

    return true;
}

mmu.sendRequest = () => {
    let requestContents = document.body.find('#request-contents');

    if (mmu.validateRequest()) {
        let params = kerdx.jsonForm(requestContents);
        let requestData = document.body.find('#request-data');
        let allData = requestData.findAll('.request-single-data');
        params.data = {};
        let value, type;
        for (let i = 0; i < allData.length; i++) {
            value = allData[i].find('.request-single-data-value').value;
            type = allData[i].find('.request-single-data-type').value;
            if (type == 'Json') {
                params.data[allData[i].find('.request-single-data-name').value] = JSON.parse(value);
            }
            else if (type == 'Array') {
                params.data[allData[i].find('.request-single-data-name').value] = value == '' ? [] : value.split(',');
            }
            else {
                params.data[allData[i].find('.request-single-data-name').value] = value;
            }
        }
        logger.disableInput();
        logger.write(`Connecting to ${params.url}`);
        system.connect(params).then(result => {
            logger.write('Connected');
            logger.write(result);
        }).catch(error => {
            console.log(error)
        }).finally(logger.enableInput());
    }
}

mmu.render = () => {
    let header = document.body.makeElement({
        element: 'header', attributes: { id: 'header-window' }
    });

    let main = document.body.makeElement({
        element: 'main', attributes: { id: 'main-window' }, children: [
            { element: 'nav', attributes: { id: 'navigator' } },
            {
                element: 'section', attributes: { id: 'request-window' }, children: [
                    {
                        element: 'div', attributes: { id: 'request-contents' }, children: [
                            mmu.generateRequestContent({ name: 'url' }),
                            mmu.generateRequestContent({ name: 'method', options: ['POST', 'GET', 'DELETE'] }),
                            {
                                element: 'div', attributes: { class: 'request-window-content' }, children: [
                                    { element: 'label', attributes: { class: 'request-window-content-label' }, text: 'Request Data' },
                                    { element: 'i', attributes: { class: 'fas fa-plus', id: 'new-data' } }
                                ]
                            },
                        ]
                    },
                    { element: 'div', attributes: { id: 'request-data' } },
                    {
                        element: 'div', attributes: { id: 'request-controls' }, children: [
                            { element: 'button', attributes: { id: 'submit-request' }, text: 'Submit Request' }
                        ]
                    }
                ]
            },
            logger.createWindow()
        ]
    });

    let newData = main.find('#new-data');
    let submitRequest = main.find('#submit-request');
    let requestData = main.find('#request-data');
    let responseWindow = main.find('#response-window');
    let responseWindowClear = main.find('#response-window-clear');
    let responseWindowToggle = main.find('#response-window-toggle');

    newData.addEventListener('click', event => {
        requestData.makeElement(mmu.generateData());
    });

    requestData.addEventListener('click', event => {
        if (event.target.classList.contains('request-single-data-remove')) {
            event.target.parentNode.remove();
        }
    });

    submitRequest.addEventListener('click', event => {
        mmu.sendRequest();
    });

    responseWindowToggle.addEventListener('click', event => {
        responseWindow.toggleClass('response-window-full');
        responseWindowToggle.toggleClass('fa-arrow-down');
        responseWindowToggle.toggleClass('fa-arrow-up');
    });

    responseWindowClear.addEventListener('click', event => {
        logger.clear();
    });
}

document.addEventListener('DOMContentLoaded', event => {
    document.body.innerHTML = '';
    mmu.render();
});
