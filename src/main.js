const { Base, AppLibrary, Compression, IndexedLibrary } = require('kedio/browser');
window.base = new Base(window);
window.app = { settingsWindow: {} };
window.compressor = Compression();
window.appLibrary = AppLibrary();
window.database = IndexedLibrary('Requestio');

const Request = require('./functions/Request');
const PageTitle = require('./functions/PageTitle');
const Explorer = require('./functions/Explorer');
const Settings = require('./functions/Settings');

app.explorer = Explorer();

app.defaultSettings = { _id: 'colors', data: { base: '#000000', text: '#ffffff', accient: '#000fff' } };
window.settings = {};
app.getRequestId = () => {
    let flag = true, id;
    return new Promise((resolve, reject) => {
        base.runParallel({
            pages: database.find({ collection: 'pages', many: true }),
            openPages: database.find({ collection: 'openpages', many: true })
        }, res => {
            let pages = res.pages.concat(res.openPages);
            let _ids = base.object.valueOfObjectArray(pages, '_id');
            id = database.generateId();
            while (flag = _ids.includes(id)) {
                id = database.generateId();
            }

            resolve(id);
        });
    });
}

app.createRequestPage = (data = {}, saved = {}) => {
    let page = Array.from(app.pageContent.findAll('.single-file')).find(page => {
        return page.props._id == data._id;
    });

    if (page) {
        page.pageTitle.click();
    }
    else {
        let request = Request(data, saved);
        let pageTitle = PageTitle({ name: data.name, content: request });
        request.pageTitle = pageTitle;
        request.checkChanges();

        document.body.find('#header-window').append(pageTitle);
        document.body.find('#page-content').append(request);
    }
}

app.saveActiveRequest = (flag) => {
    let active = document.body.find('#page-content').find('.active.single-file');
    if (active) {
        if (flag) {//save as
            let data = JSON.parse(JSON.stringify(active.props));
            app.getRequestId().then(id => {
                data._id = id;
                app.explorer.save(data);
            });
        }
        else if (active.isChanged) {
            if (active.saved.name == undefined) {
                let data = JSON.parse(JSON.stringify(active.props));
                app.explorer.save(data).then(saved => {
                    active.draft.name = saved.name;
                    active.pageTitle.changeTitle(saved.name);
                    active.saved = JSON.parse(JSON.stringify(active.props));
                    database.save({ collection: 'openpages', query: active.props, check: { _id: active.props._id } });
                });
            }
            else {
                database.update({ collection: 'pages', query: active.props, check: { name: active.saved.name } }).then(saved => {
                    if (saved.documents[active.saved._id].status == true) {
                        alert('Page saved');
                        active.saved = JSON.parse(JSON.stringify(active.props));
                        active.checkChanges();
                    }
                    else {
                        alert('Error! Page not saved');
                    }
                });
            }
        }
    }
    else {
        alert('Error! No open pages');
    }
};

app.openRequestPage = () => {
    app.explorer.open().then(data => {
        app.createRequestPage(data, data);
    });
}

app.openSettings = () => {
    if (!Array.from(document.body.find('#page-content').findAll('.single-file')).includes(app.settingsWindow)) {
        let pageTitle = PageTitle({ name: 'System:settings', content: app.settingsWindow });
        app.settingsWindow.pageTitle = pageTitle;

        document.body.find('#header-window').append(pageTitle);
        document.body.find('#page-content').append(app.settingsWindow);
    }

    app.settingsWindow.pageTitle.click();
}

app.getFileOptions = () => {
    if (app.fileOption == undefined) {
        app.fileOption = base.createElement({
            element: 'span', attributes: { id: 'file-options', class: 'listed-options' }, children: [
                { element: 'span', attributes: { id: 'new', class: 'listed-option-item' }, text: 'New' },
                { element: 'span', attributes: { id: 'open', class: 'listed-option-item' }, text: 'Open' },
                { element: 'span', attributes: { id: 'save', class: 'listed-option-item' }, text: 'Save' },
                { element: 'span', attributes: { id: 'save-as', class: 'listed-option-item' }, text: 'Save As' }
            ]
        });

        app.fileOption.addEventListener('click', event => {
            if (event.target.id == 'new') {
                app.getRequestId().then(_id => {
                    app.createRequestPage({ _id }, {});
                });
            }
            else if (event.target.id == 'open') {
                app.openRequestPage();
            }
            else if (event.target.id == 'save') {
                app.saveActiveRequest();
            }
            else if (event.target.id == 'save-as') {
                app.saveActiveRequest(true);
            }
        });

        app.fileOption.notBubbledEvent('click', event => {
            if (app.fileOption.added) {
                app.fileOption.added = false;
                app.fileOption.remove();
            }
        });
    }

    app.fileOption.onAdded(() => {
        let timed = setTimeout(() => {
            app.fileOption.added = true;
            clearTimeout(timed);
        }, 100);
    });

    return app.fileOption;
}

app.getViewOptions = () => {
    if (app.viewOption == undefined) {
        app.viewOption = base.createElement({
            element: 'span', attributes: { id: 'view-options', class: 'listed-options' }, children: [
                { element: 'span', attributes: { id: 'settings', class: 'listed-option-item' }, text: 'Settings' },
            ]
        });

        app.viewOption.addEventListener('click', event => {
            if (event.target.id == 'settings') {
                app.openSettings();
            }
        });

        app.viewOption.notBubbledEvent('click', event => {
            if (app.viewOption.added) {
                app.viewOption.added = false;
                app.viewOption.remove();
            }
        });
    }

    app.viewOption.onAdded(() => {
        let timed = setTimeout(() => {
            app.viewOption.added = true;
            clearTimeout(timed);
        }, 100);
    });

    return app.viewOption;
}

app.loadDraft = () => {
    window.database.find({ collection: 'openpages', many: true }).then(pages => {
        for (let page of pages) {
            window.database.find({ collection: 'pages', query: { _id: page._id } }).then(saved => {
                app.createRequestPage(page, saved || {});
            });
        }
    });
}

app.render = () => {
    app.init().then(() => {
        let [sidebar, main] = document.body.makeElement([
            {
                element: 'sidebar', attributes: { id: 'sidebar' }, children: [
                    {
                        element: 'span', attributes: { id: 'logo' }, html: `{${base.createElement({
                            element: 'a', attributes: { style: { color: 'var(--accient-color)', fontSize: '1em' } }, text: 'Req'
                        }).outerHTML}}`
                    },
                    {
                        element: 'div', attributes: { id: 'sidebar-panel' }, children: [
                            {
                                element: 'span', attributes: { id: 'file', class: 'sidebar-button' }, children: [
                                    { element: 'i', attributes: { class: 'sidebar-button-icon fas fa-folder' } },
                                ]
                            },
                            {
                                element: 'span', attributes: { id: 'view', class: 'sidebar-button' }, children: [
                                    { element: 'i', attributes: { class: 'sidebar-button-icon fas fa-cog' } },
                                ]
                            },
                        ]
                    }
                ]
            },
            {
                element: 'main', attributes: { id: 'main-window' }, children: [
                    {
                        element: 'header', attributes: { id: 'header-window' }, children: [

                        ]
                    },
                    {
                        element: 'section', attributes: { id: 'page-content' }
                    }
                ]
            }
        ]);

        app.pageContent = document.body.find('#page-content');
        let sideClicked;

        sidebar.addEventListener('click', event => {
            sideClicked = event.target;
            if ((sideClicked.id == 'file' || sideClicked.getParents('#file') != null) && !(sideClicked.id == 'file-options' || sideClicked.getParents('#file-options') != null)) {
                sidebar.find('#file.sidebar-button').toggleChild(app.getFileOptions());
            }

            if ((sideClicked.id == 'view' || sideClicked.getParents('#view') != null) && !(sideClicked.id == 'view-options' || sideClicked.getParents('#view-options') != null)) {
                sidebar.find('#view.sidebar-button').toggleChild(app.getViewOptions());
            }
        });

        app.loadDraft();
        database.find({ collection: 'settings', many: true }).then(settings => {
            for (let s of settings) {
                window.settings[s._id] = s.data;
            }
            app.settingsWindow = Settings();
            app.loadRoot();
        });
    });
}

app.init = async () => {
    let collections = ['pages', 'openpages', 'settings'];
    let toCreate = [];
    for (let c of collections) {
        if (!await database.collectionExists(c)) {
            toCreate.push(c);
        }
    }

    if (toCreate.length) {
        let splash = document.body.makeElement({
            element: 'span', attributes: { id: 'splash-screen' }, children: [
                { element: 'i', attributes: { id: 'icon', class: 'fas fa-cog fa-spin' } },
                { element: 'a', attributes: { id: 'welcome-note' }, text: 'Setting up...' }
            ]
        });

        return window.database.createCollection(...toCreate).then(done => {
            if (toCreate.includes('settings')) {
                return database.insert({ collection: 'settings', query: app.defaultSettings }).then(() => {
                    splash.remove();
                    return
                })
            }
            return;
        });
    }
}

app.loadRoot = () => {
    let root = document.head.find('#root');
    let text = `
    :root{
    --base-color: ${window.settings.colors.base};
    --semi-base-color: ${window.base.colorHandler.addOpacity(window.settings.colors.base, 0.5)};
    --text-color: ${window.settings.colors.text};
    --semi-text-color: ${window.base.colorHandler.addOpacity(window.settings.colors.text, 0.5)};
    --accient-color: ${window.settings.colors.accient};
    --semi-accient-color: ${window.base.colorHandler.addOpacity(window.settings.colors.accient, 0.5)};
    --extra-color: rgb(0, 11, 77);
    --small-font: .8em;
    --normal-font: 1em;
    --large-font: 1.2em;
    --extra-font: 1.5em;
        }
    `;
    if (!root) {
        root = document.head.makeElement({ element: 'style', attributes: { id: 'root' } });
    }
    root.textContent = text;
}

document.addEventListener('DOMContentLoaded', event => {
    document.body.innerHTML = '';
    app.render();
});
