function Settings() {
    const self = base.createElement({
        element: 'div', attributes: { class: 'single-file', id: 'system-settings-page' }
    });

    self.init = () => {
        self.props = { _id: 'system:settings' }
        self.colorManager = self.makeElement({
            element: 'div', attributes: { id: 'settings-color', class: 'settings-pane' }, children: [
                { element: 'text', attributes: { class: 'settings-pane-title' }, text: 'Colors' },
                {
                    element: 'span', attributes: { class: 'settings-pane-content' }, children: [
                        {
                            element: 'span', attributes: { class: 'settings-color-item' }, children: [
                                { element: 'label', attributes: {}, text: 'Base Color:' },
                                { element: 'input', attributes: { id: 'settings-base-color', type: 'color', value: window.settings.colors.base } }
                            ]
                        },
                        {
                            element: 'span', attributes: { class: 'settings-color-item' }, children: [
                                { element: 'label', attributes: {}, text: 'Text Color:' },
                                { element: 'input', attributes: { id: 'settings-text-color', type: 'color', value: window.settings.colors.text } }
                            ]
                        },
                        {
                            element: 'span', attributes: { class: 'settings-color-item' }, children: [
                                { element: 'label', attributes: {}, text: 'Accient Color:' },
                                { element: 'input', attributes: { id: 'settings-accient-color', type: 'color', value: window.settings.colors.accient } }
                            ]
                        }
                    ]
                }
            ]
        });

        self.colorManager.find('#settings-base-color').onChanged(color => {
            window.settings.colors.base = color;
            self.save('colors');
        });

        self.colorManager.find('#settings-text-color').onChanged(color => {
            window.settings.colors.text = color;
            self.save('colors');
        });

        self.colorManager.find('#settings-accient-color').onChanged(color => {
            window.settings.colors.accient = color;
            self.save('colors');
        });
    }

    self.close = () => {
        self.remove();
    }

    self.save = (_id) => {
        let query = { _id, data: window.settings[_id] };
        database.save({ collection: 'settings', query, check: { _id } }).then(saved => {
            if(saved.documents.colors != undefined){
                window.app.loadRoot();
            }
        });
    }

    self.init();

    return self;
}

module.exports = Settings;