(function(exports) {

    /**
     * @class Modal
     * @lends Modal#
     * @requires Mustache
     * @description Primitive UI modal window class
     */
    var Modal = exports.Modal = new Class({
                Implements : [Events, Options],

                options : {
                    textOk : 'Ok',
                    textCancel : 'Cancel',
                    template : 'modal-tpl'
                },

                /**
                 * Primitive UI modal window class
                 * 
                 * @constructor
                 * @constructs
                 * 
                 * @param {Object}
                 *            options
                 * @param {String}
                 *            [options.textHeader] Header text
                 * @param {String}
                 *            options.textMessage Message text
                 * @param {String}
                 *            [options.textOk] Ok button text
                 * @param {String}
                 *            [options.textCancel] Cancel button text
                 * @param {Function}
                 *            options.onCancel Cancel or close callback
                 * @param {Function}
                 *            options.onAccept Ok callback
                 */
                initialize : function(options) {
                    this.setOptions(options);
                    this.render(this.options.container);
                },

                /**
                 * Creates modal window from template and shows it
                 * 
                 * @param {Element}
                 *            container
                 */
                render : function(container) {
                    container = container || document.body;
                    var tpl = $(this.options.template).get('html'),
                        rendered =
                                (new Element('div')).set('html',
                                        Mustache.render(tpl, this.options))
                                        .getChildren()[0];
                    this.container =
                            this.position(this.enhance(rendered).inject(
                                    container, 'top'));
                },

                /**
                 * Positions modal window centered in its parent block
                 */
                position : function(modal, parent) {
                    var size = modal.getSize(),
                        parentSize = (parent || modal.getParent()).getSize();
                    return modal.setStyles({
                                'top' : Math.max(0, Math
                                                .round((parentSize.y - size.y)
                                                        / 2)),
                                'left' : Math.max(0, Math
                                                .round((parentSize.x - size.x)
                                                        / 2))
                            });
                },

                /**
                 * Adds handlers
                 * 
                 * @param {Element}
                 *            container
                 * @return {Element}
                 */
                enhance : function(container) {
                    var controls = container.getElements('*[data-action]'),
                        modal = this;
                    controls.addEvent('click', function(evt) {
                                evt.stop();
                                modal
                                        .fireEvent(this
                                                .getProperty('data-action'));
                                modal.destroy();
                            });
                    return container;
                },

                /**
                 * Destructor
                 */
                destroy : function() {
                    this.container.destroy();
                    delete this.container;
                }
            });

})(window);
