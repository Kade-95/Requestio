const Logger = require('./Logger.js');
const System = require('./System.js');

let system = System();

let generateRequestContent = (params = { name: '', options: [], value: '' }) => {
    let label = base.camelCasedToText(params.name);
    let nodeName = 'input';

    if (Array.isArray(params.options)) {
        nodeName = 'select';
    }

    let content = base.createElement({
        element: 'div', attributes: { class: 'request-window-content' }, children: [
            { element: 'label', attributes: { class: 'request-window-content-label' }, text: label },
            { element: nodeName, attributes: { class: 'request-window-content-data', name: params.name, id: params.name, value: params.value } },
        ]
    });

    if (Array.isArray(params.options)) {
        content.find('.request-window-content-data').makeElement({
            element: 'option', attributes: { selected: true, disabled: true, value: null }, text: `Select ${label}`
        });

        for (let option of params.options) {
            let o = content.find('.request-window-content-data').makeElement({
                element: 'option', attributes: { value: option }, text: option
            });
            if (option == params.value) o.setAttribute('selected', true);
        }
    }

    return content;
}
let prototype = {
    connection: {
        url: '', method: '', data: {}
    },
    log: {}
}

function Request(data = {}, saved = {}) {
    if (data == undefined || data.constructor != Object) data = JSON.parse(JSON.stringify(prototype));

    if (data.connection == undefined || data.connection.constructor != Object) data.connection = JSON.parse(JSON.stringify(prototype.connection))

    if (data.connection.data == undefined || data.connection.data.constructor != Object) data.connection.data = JSON.parse(JSON.stringify(prototype.connection.data));

    if (data.log == undefined || data.log.constructor != Object) data.log = JSON.parse(JSON.stringify(prototype.log));

    const self = base.createElement({
        element: 'div', attributes: { class: 'single-file dock-side' }, children: [
            {
                element: 'section', attributes: { id: 'request-window' }, children: [
                    {
                        element: 'div', attributes: { id: 'request-contents' }, children: [
                            generateRequestContent({ name: 'url', value: data.connection.url }),
                            generateRequestContent({ name: 'method', options: ['POST', 'GET', 'DELETE'], value: data.connection.method }),
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
            Logger(data.log)
        ]
    });

    self.props = JSON.parse(JSON.stringify(data)) || {};

    let timed;
    self.draft = base.object.onChanged(self.props, (obj) => {
        timed = setTimeout(() => {
            self.checkChanges();
            clearTimeout(timed);
        }, 50);
    });

    self.console = self.find('#response-window');
    self.console.addEventListener('logChanged', event => {
        self.draft.log = self.console.stored;
    });

    self.saved = JSON.parse(JSON.stringify(saved));
    self.isChanged = self.saved.name == undefined;

    self.checkChanges = () => {
        self.isChanged = JSON.stringify(self.props) != JSON.stringify(self.saved);
        self.pageTitle.setChanged(self.isChanged);

        if (self.isChanged) {
            base.log('Saving draft');
            database.save({ collection: 'openpages', query: self.props, check: { _id: self.props._id } }).then(res=>{
                base.log('Draft saved');
            });
        }
    }

    self.init = () => {
        let newData = self.find('#new-data');
        let submitRequest = self.find('#submit-request');
        let requestData = self.find('#request-data');

        for (let key in self.props.connection.data) {
            let single = self.singleData(self.props.connection.data[key]);
            single.dataset.domKey = key;
            requestData.makeElement(single);
        }

        self.find('.request-window-content-data#url').addEventListener('change', event => {
            self.draft.connection.url = event.target.value;
        });

        self.find('.request-window-content-data#method').addEventListener('change', event => {
            self.draft.connection.method = event.target.value;
        });

        newData.addEventListener('click', event => {
            let single = self.singleData()
            requestData.makeElement(single);
            self.draft.connection.data[single.dataset.domKey] = { name: '', value: '', type: '' };
        });

        requestData.addEventListener('click', event => {
            if (event.target.classList.contains('request-single-data-remove')) {
                let single = event.target.parentNode;
                single.remove();
                delete self.draft.connection.data[single.dataset.domKey];
            }
        });

        submitRequest.addEventListener('click', event => {
            self.sendRequest();
        });

        self.onAdded(() => {
            let active = self.parentNode.find('.single-file.active');
            if (active) active.removeClass('active');
            self.addClass('active');
        });
    }

    self.singleData = (details = { name: '', value: '', type: '' }) => {
        let single = base.createElement({
            element: 'div', attributes: { class: 'request-single-data' }, children: [
                { element: 'input', attributes: { class: 'request-single-data-name', placeHolder: 'Name', value: details.name } },
                { element: 'i', attributes: { class: 'fas fa-angle-double-right' } },
                { element: 'input', attributes: { class: 'request-single-data-value', placeHolder: 'Value', value: details.value } },
                { element: 'select', attributes: { class: 'request-single-data-type' }, options: ['String', 'Array', 'Json'], selected: details.type },
                { element: 'i', attributes: { class: 'request-single-data-remove fas fa-trash' } }
            ]
        });

        single.find('.request-single-data-name').onChanged(value => {
            self.draft.connection.data[single.dataset.domKey].name = value;
        });

        single.find('.request-single-data-value').onChanged(value => {
            self.draft.connection.data[single.dataset.domKey].value = value;
        });

        single.find('.request-single-data-type').onChanged(value => {
            self.draft.connection.data[single.dataset.domKey].type = value;
        });

        return single;
    }

    self.validateRequest = () => {
        let requestContents = self.find('#request-contents');
        let validateForm = base.validateForm(requestContents);
        if (!validateForm.flag) {
            self.console.write(`${base.camelCasedToText(validateForm.elementName)} is required`);
            return false;
        }

        return true;
    }

    self.sendRequest = () => {
        let requestContents = self.find('#request-contents');

        if (self.validateRequest()) {
            let params = base.jsonForm(requestContents);
            let requestData = self.find('#request-data');
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

            self.console.disableInput();
            self.console.write(`Connecting to ${params.url}`);
            system.connect(params).then(result => {
                self.console.write('Connected');
                self.console.write(result);
            }).catch(error => {
                console.log(error)
            }).finally(self.console.enableInput());
        }
    }

    self.close = () => {
        base.log('Deleting draft')
        window.database.delete({ collection: 'openpages', query: { _id: self.props._id } }).then(res => {
            base.log('Draft deleted');
        })
        self.remove();
    }

    self.init();
    return self;
}

module.exports = Request;