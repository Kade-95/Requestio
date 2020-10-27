function Explorer() {
    const self = base.popUp(
        {
            element: 'div', attributes: { id: 'explorer-window' }, children: [
                { element: 'span', attributes: { id: 'explorer-title' }, text: 'Saved Pages' },
                {
                    element: 'span', attributes: { id: 'explorer-canvas' }, children: [
                        { element: 'span', attributes: { id: 'explorer-pages-container' } },
                        { element: 'a', attributes: { id: 'explorer-empty', style: { display: 'none' } }, text: 'Empty? Please save a page.' },
                        {
                            element: 'span', attributes: { id: 'explorer-controls' }, children: [
                                { element: 'input', attributes: { placeHolder: 'Search page...', id: 'current-page' } },
                                { element: 'button', attributes: { id: 'explorer-action' } }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            title: 'ReqExplorer',
            attributes: { style: { width: '50%', height: '100%', justifySelf: 'flex-end' } }
        }
    );

    self.init = () => {
        self.canvas = self.find('#explorer-canvas');
        self.pagesContainer = self.find('#explorer-pages-container');
        self.pageName = self.find('#current-page');
        self.empty = self.find('#explorer-empty');

        self.options = base.createElement({
            element: 'span', attributes: { id: 'explorer-options' }, children: [
                { element: 'a', attributes: { id: 'explorer-option-rename', class: 'explorer-option-single' }, text: 'Rename' },
                { element: 'a', attributes: { id: 'explorer-option-delete', class: 'explorer-option-single' }, text: 'Delete' }
            ]
        });
        self.options.notBubbledEvent('click', event => {
            if (self.options.added) {
                self.options.remove();
            }
        });

        self.canvas.addEventListener('click', event => {
            if (event.target.classList.contains('explorer-page-single-options-icon')) {
                event.target.parentNode.append(self.options);
                self.options.added = false;
                setTimeout(() => {
                    self.options.added = true;
                }, 100);
            }
            else if (event.target.id == 'explorer-option-delete') {
                let page = event.target.getParents('.explorer-page-single');
                let _id = page.dataset.id;
                if (confirm('This page will be deleted!!')) {
                    window.database.delete({ collection: 'pages', query: { _id } });
                    page.remove();
                }
            }
            else if (event.target.id == 'explorer-option-rename') {
                let page = event.target.getParents('.explorer-page-single');
                database.documentExists({ collection: 'openpages', query: { _id: page.dataset._id } }).then(open => {
                    if (open) {
                        alert('Error! Page is open');
                    }
                    else {
                        let name = prompt('Name');
                        database.update({ collection: 'pages', query: { name }, check: { _id: page.dataset._id } });
                        page.find('.explorer-page-single-text').textContent = name;
                        page.dataset.name = name;
                    }
                });
            }
            else if (event.target.classList.contains('explorer-page-single') || event.target.getParents('.explorer-page-single') != null) {
                let target = event.target;
                if (!target.classList.contains('explorer-page-single')) target = target.getParents('.explorer-page-single');
                self.pageName.value = target.dataset.name;
                self.pageName.dataset._id = target.dataset._id;
            }
        });

        self.search();
    }

    self.getAction = (name) => {
        let action = self.find('#explorer-action');
        let newAction = action.cloneNode(true);
        newAction.textContent = newAction.dataset.name = name;
        action.remove();

        self.canvas.find('#explorer-controls').makeElement(newAction);
        return newAction;
    }

    self.singlePage = (data) => {
        let page = base.createElement({
            element: 'span', attributes: { class: 'explorer-page-single', 'data-name': data.name, 'data-_id': data._id }, children: [
                { element: 'a', attributes: { class: 'explorer-page-single-text' }, text: data.name },
                {
                    element: 'span', attributes: { class: 'explorer-page-single-options' }, children: [
                        { element: 'i', attributes: { class: 'explorer-page-single-options-icon fas fa-ellipsis-v' } }
                    ]
                }
            ]
        });

        return page;
    }

    self.populate = () => {
        return database.find({ collection: 'pages', many: true }).then(pages => {
            self.pages = pages;
            self.pagesContainer.innerHTML = '';

            if (pages.length == 0) {
                self.empty.cssRemove(['display']);
                self.pagesContainer.css({ display: 'none' });
            }
            else {
                self.pagesContainer.cssRemove(['display']);
                self.empty.css({ display: 'none' });

                for (let d of pages) {
                    self.pagesContainer.makeElement(self.singlePage(d));
                }
            }
        });
    }

    self.search = () => {
        let matches;
        self.pageName.onChanged(value => {
            matches = 0;

            self.pagesContainer.children.forEach(element => {
                if (element.dataset.name.toLowerCase().indexOf(self.pageName.value.toLowerCase()) == -1) {
                    element.css({ display: 'none' });
                }
                else {
                    element.cssRemove(['display']);
                    matches++;
                }
            });

            if (matches == 0) {
                self.empty.cssRemove(['display']);
                self.pagesContainer.css({ display: 'none' });
            }
            else {
                self.pagesContainer.cssRemove(['display']);
                self.empty.css({ display: 'none' });
            }
        });
    }

    self.save = (query) => {
        document.body.makeElement(self);

        return new Promise((resolve, reject) => {
            self.populate().then(() => {
                self.getAction('Save').addEventListener('click', event => {

                    if (self.pageName.value == '') {
                        alert('Error! Invalid name provided, \nName must not be empty.');
                        return;
                    }
                    query.name = self.pageName.value;
                    base.log('Saving Page...');
                    window.database.insert({ collection: 'pages', query })
                        .then(res => {
                            base.log('Page saved');
                            resolve(res.documents);
                            self.close();
                        })
                        .catch(error => {
                            alert('System Error! Page not saved');
                        });
                });
            });
        });
    }

    self.open = () => {
        document.body.makeElement(self);
        return new Promise((resolve, reject) => {
            self.populate().then(() => {
                self.getAction('Open').addEventListener('click', event => {
                    if (event.target.id == 'explorer-action') {
                        console.log(self.pageName.dataset._id);
                        let page = self.pages.find(item => item._id == self.pageName.dataset._id);
                        if (page != undefined) {
                            resolve(page);
                            self.close();
                        }
                    }
                });
            });
        });
    }

    self.close = () => {
        self.remove();
    }

    self.init();
    return self;
}

module.exports = Explorer;