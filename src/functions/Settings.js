function Settings() {
    const self = base.createElement({
        element: 'div', attributes: { class: 'single-file', id: 'system-settings-page' }, text: 'This is Settings, Coming soon'
    });

    self.props = { _id: 'system:settings' }
    return self;
}

module.exports = Settings;