const { Base, AppLibrary, Compression, IndexedLibrary, ObjectsLibrary } = require('kedio/browser');
window.base = new Base(window);
window.self = {};
window.compressor = Compression();
window.appLibrary = AppLibrary();
window.database = IndexedLibrary('Requestio');

const Request = require('./functions/Request');
const PageTitle = require('./functions/PageTitle');
const Explorer = require('./functions/Explorer');
const settings = require('./functions/Settings')();

self.explorer = Explorer();

self.getRequestId = () => {
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

self.createRequestPage = (data = {}, saved = {}) => {
    let page = Array.from(self.pageContent.findAll('.single-file')).find(page => {
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

self.saveActiveRequest = (flag) => {
    let active = document.body.find('#page-content').find('.active.single-file');
    if (active) {
        if (flag) {//save as
            let data = JSON.parse(JSON.stringify(active.props));
            self.getRequestId().then(id => {
                data._id = id;
                self.explorer.save(data);
            });
        }
        else if (active.isChanged) {
            if (active.saved.name == undefined) {
                let data = JSON.parse(JSON.stringify(active.props));
                self.explorer.save(data).then(saved => {
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

self.openRequestPage = () => {
    self.explorer.open().then(data => {
        self.createRequestPage(data, data);
    });
}

self.openSettings = () => {
    if (!Array.from(document.body.find('#page-content').findAll('.single-file')).includes(settings)) {
        let pageTitle = PageTitle({ name: 'System:settings', content: settings });
        settings.pageTitle = pageTitle;

        document.body.find('#header-window').append(pageTitle);
        document.body.find('#page-content').append(settings);
    }

    settings.pageTitle.click();


}

self.getFileOptions = () => {
    if (self.fileOption == undefined) {
        self.fileOption = base.createElement({
            element: 'span', attributes: { id: 'file-options', class: 'listed-options' }, children: [
                { element: 'span', attributes: { id: 'new', class: 'listed-option-item' }, text: 'New' },
                { element: 'span', attributes: { id: 'open', class: 'listed-option-item' }, text: 'Open' },
                { element: 'span', attributes: { id: 'save', class: 'listed-option-item' }, text: 'Save' },
                { element: 'span', attributes: { id: 'save-as', class: 'listed-option-item' }, text: 'Save As' }
            ]
        });

        self.fileOption.addEventListener('click', event => {
            if (event.target.id == 'new') {
                self.getRequestId().then(_id => {
                    self.createRequestPage({ _id }, {});
                });
            }
            else if (event.target.id == 'open') {
                self.openRequestPage();
            }
            else if (event.target.id == 'save') {
                self.saveActiveRequest();
            }
            else if (event.target.id == 'save-as') {
                self.saveActiveRequest(true);
            }
        });

        self.fileOption.notBubbledEvent('click', event => {
            if (self.fileOption.added) {
                self.fileOption.added = false;
                self.fileOption.remove();
            }
        });
    }

    self.fileOption.onAdded(() => {
        let timed = setTimeout(() => {
            self.fileOption.added = true;
            clearTimeout(timed);
        }, 100);
    });

    return self.fileOption;
}

self.getViewOptions = () => {
    if (self.viewOption == undefined) {
        self.viewOption = base.createElement({
            element: 'span', attributes: { id: 'view-options', class: 'listed-options' }, children: [
                { element: 'span', attributes: { id: 'settings', class: 'listed-option-item' }, text: 'Settings' },
            ]
        });

        self.viewOption.addEventListener('click', event => {
            if (event.target.id == 'settings') {
                self.openSettings();
            }
        });

        self.viewOption.notBubbledEvent('click', event => {
            if (self.viewOption.added) {
                self.viewOption.added = false;
                self.viewOption.remove();
            }
        });
    }

    self.viewOption.onAdded(() => {
        let timed = setTimeout(() => {
            self.viewOption.added = true;
            clearTimeout(timed);
        }, 100);
    });

    return self.viewOption;
}

self.loadDraft = () => {
    window.database.find({ collection: 'openpages', many: true }).then(pages => {
        for (let page of pages) {
            window.database.find({ collection: 'pages', query: { _id: page._id } }).then(saved => {
                self.createRequestPage(page, saved || {});
            });
        }
    });
}

self.render = () => {
    self.init().then(() => {
        let [sidebar, main] = document.body.makeElement([
            {
                element: 'sidebar', attributes: { id: 'sidebar' }, children: [
                    {
                        element: 'span', attributes: { id: 'logo' }, html: `{${base.createElement({
                            element: 'a', attributes: { style: { color: 'blue', fontSize: '1em' } }, text: 'Req'
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

        self.pageContent = document.body.find('#page-content');
        let sideClicked;

        sidebar.addEventListener('click', event => {
            sideClicked = event.target;
            if ((sideClicked.id == 'file' || sideClicked.getParents('#file') != null) && !(sideClicked.id == 'file-options' || sideClicked.getParents('#file-options') != null)) {
                sidebar.find('#file.sidebar-button').toggleChild(self.getFileOptions());
            }

            if ((sideClicked.id == 'view' || sideClicked.getParents('#view') != null) && !(sideClicked.id == 'view-options' || sideClicked.getParents('#view-options') != null)) {
                sidebar.find('#view.sidebar-button').toggleChild(self.getViewOptions());
            }
        });

        self.loadDraft();
    });
}

self.init = async () => {
    let collections = ['pages', 'openpages'];
    let toCreate = [];
    for (let c of collections) {
        if (!await database.collectionExists(c)) {
            toCreate.push(c);
        }
    }
    
    if (toCreate.length) {
        let splash = document.body.makeElement({
            element: 'span', attributes: { id: 'splash-screen' }, children: [
                { element: 'i', attributes: { id: 'icon', class: 'fas fa-cog fa-spin' }},
                { element: 'a', attributes: { id: 'welcome-note' }, text: 'Setting up...' }
            ]
        })
        return window.database.createCollection(...toCreate).then(done => {
            splash.remove();
            return;
        });
    }
}

document.addEventListener('DOMContentLoaded', event => {
    document.body.innerHTML = '';
    self.render();
});
