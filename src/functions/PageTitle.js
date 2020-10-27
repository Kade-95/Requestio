function PageTitle(params = { name: '', content: new Element() }) {
    if (params.name == undefined) params.name = 'undefined';

    let self = base.createElement({
        element: 'span', attributes: { class: 'page-title' }, children: [
            { element: 'a', attributes: { class: 'page-title-text' }, text: params.name },
            { element: 'i', attributes: { class: 'page-title-icon fas fa-circle' } }
        ]
    });

    self.close = self.find('.page-title-icon');
    self.content = params.content;

    self.addEventListener('click', event => {
        let active = self.parentNode.find('.page-title.active');
        if (active) active.removeClass('active');
        self.addClass('active');

        let activePage = self.content.parentNode.find('.single-file.active');
        if (activePage) activePage.removeClass('active');
        self.content.addClass('active');

        if (event.target == self.close) {
            next = self.nextSibling;
            if(next == null) next = self.previousSibling;
            if(next != null) next.click();

            self.remove();
            self.content.close();
        }
    });

    self.onAdded(() => {
        let active = self.parentNode.find('.page-title.active');
        if (active) active.removeClass('active');
        self.addClass('active');
    });

    self.addEventListener('mouseenter', event => {
        self.close.removeClass('fa-circle');
        self.close.addClass('fa-times');
        self.close.css({ visibility: 'visible' });
    });

    self.addEventListener('mouseleave', event => {
        self.close.addClass('fa-circle');
        self.close.removeClass('fa-times');
        if (!self.content.isChanged) self.close.cssRemove(['visibility']);
    });

    self.setChanged = () => {
        if (self.content.isChanged) {
            self.close.css({ visibility: 'visible' });
        }
        else {
            self.close.cssRemove(['visibility']);
        }
    };

    self.changeTitle = (title) => {
        self.find('.page-title-text').textContent = title;
    };

    return self;
}

module.exports = PageTitle;