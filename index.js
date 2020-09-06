import { Kerdx } from 'https://kade-95.github.io/kerdx/index.js';
const kerdx = new Kerdx();
window.system = {};
window.k = kerdx;

system.connect = (params) => {
    return new Promise((resolve, reject) => {
        kerdx.api.ajax(params)
            .then(result => {
                result = JSON.parse(result);
                resolve(result);
            })
            .catch(err => {
                reject(err);
            });
    });
}

system.generateRequestContent = (params = { name: '', options: [] }) => {
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

system.generateData = () => {
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

system.clearLog = () => {
    document.body.find('#response-window-log').innerHTML = '';
}

system.log = (data) => {
    let time = `[${kerdx.time()}]:`;
    let logItem = kerdx.createElement({
        element: 'div', attributes: { class: 'log-item' }, children: [
            { element: 'label', text: time },
        ]
    });

    if (data instanceof Element) {
        logItem.append(data);
    }
    else if (typeof data == 'object') {
        kerdx.displayData(data, logItem);
    }
    else {
        logItem.makeElement({ element: 'span', html: data });
    }

    document.body.find('#response-window-log').append(logItem);
}

system.validateRequest = () => {
    let requestContents = document.body.find('#request-contents');
    let validateForm = kerdx.validateForm(requestContents);
    if (!validateForm.flag) {
        system.log(`${kerdx.camelCasedToText(validateForm.elementName)} is required`);
        return false;
    }

    return true;
}

system.sendRequest = () => {
    let requestContents = document.body.find('#request-contents');

    if (system.validateRequest()) {
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
        system.log(`Connecting to ${params.url}`);
        system.connect(params).then(result => {
            system.log('Connected');
            system.log(result);
        }).catch(error => {
            console.log(error)
        });
    }
}

system.render = () => {
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
                            system.generateRequestContent({ name: 'url' }),
                            system.generateRequestContent({ name: 'method', options: ['POST', 'GET', 'DELETE'] }),
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
            {
                element: 'div', attributes: { id: 'response-window' }, children: [
                    {
                        element: 'span', attributes: { id: 'response-window-controls' }, children: [
                            { element: 'input', attributes: { id: 'response-window-search' } },
                            { element: 'i', attributes: { id: 'response-window-toggle', class: 'fas fa-arrow-up' } },
                            { element: 'i', attributes: { id: 'response-window-clear', class: 'fas fa-trash' } }
                        ]
                    },
                    {
                        element: 'span', attributes: { id: 'response-window-log' }
                    }
                ]
            }
        ]
    });

    let newData = main.find('#new-data');
    let submitRequest = main.find('#submit-request');
    let requestData = main.find('#request-data');
    let responseWindow = main.find('#response-window');
    let responseWindowToggle = main.find('#response-window-toggle');
    let responseWindowClear = main.find('#response-window-clear');

    newData.addEventListener('click', event => {
        requestData.makeElement(system.generateData());
    });

    requestData.addEventListener('click', event => {
        if (event.target.classList.contains('request-single-data-remove')) {
            event.target.parentNode.remove();
        }
    });

    submitRequest.addEventListener('click', event => {
        system.sendRequest();
    });

    responseWindowToggle.addEventListener('click', event => {
        responseWindow.toggleClass('response-window-full');
        responseWindowToggle.toggleClass('fa-arrow-down');
        responseWindowToggle.toggleClass('fa-arrow-up');
    });

    responseWindowClear.addEventListener('click', event=>{
        system.clearLog();
    });
}

document.addEventListener('DOMContentLoaded', event => {
    system.render();
});