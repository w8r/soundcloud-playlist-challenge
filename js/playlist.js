(function(exports) {
    /**
     * @class Playlist
     * @lends Playlist#
     * @requires Track
     * @description Playlist instance class
     */
    var Playlist = exports.Playlist = new Class({

        options : {
            viewTpl : 'playlist-view-tpl',
            editTpl : 'playlist-edit-tpl',
            frameId : 'player-frame',
            formId : 'playlist-edit',
            widgetUri : 'http://w.soundcloud.com/player/',
            widgetOptions : {
                show_user : false,
                buying : false
            }
        },

        /**
         * Playlist data
         * 
         * @type Object
         */
        data : null,

        /**
         * Playlist widget
         * 
         * @type
         */
        widget : null,

        /**
         * Playlist instance class
         * 
         * @constructor
         * @constructs
         * @param {Object}
         *            data
         */
        initialize : function(data, widget, user) {
            // if no data - it's a new PL
            if (data) {
                this.data = data;
            }
            // if no widget - same
            if (widget) {
                this.widget = widget;
            }
            this.user = user;
        },

        /**
         * Adds track to playlist
         * 
         * @param {Track}
         *            track
         * @param {Number}
         *            [index]
         */
        addTrack : function(track) {
            if (track && track.url) {
                SC.get('/resolve', track, function(data, error) {
                            if (!error) {
                                // check current data
                                this.data = this.data || {
                                    tracks : []
                                };

                                // if the track isn't yet on the list
                                if (!this.data.tracks.some(function(item) {
                                            return (item.id == data.id);
                                        })) {
                                    // add it
                                    this.data.tracks.push(data);
                                    this.updatePlaylistDataFromForm();
                                    this.render(this.container, true);
                                }
                            }
                        }.bind(this));
            }
        },

        /**
         * Updates playlist data from form - for cases, when the form is being
         * re-rendered before saving
         */
        updatePlaylistDataFromForm : function() {
            var form = $(this.options.formId),
                title = form.title.get('value'),
                description = form.description.get('value');

            if (this.data.title !== title) {
                this.data.title = title;
            }

            if (this.data.description !== description) {
                this.data.description = description;
            }
        },

        /**
         * Removes track from the playlist
         * 
         * @param {Track}
         *            track
         */
        removeTrack : function(track) {
            // remove from form
            var modal = new Modal({
                textMessage : 'Are you sure you want to delete track \''
                        + track.title + '\'?',
                textHeader : 'Track deletion',
                onAccept : function() {
                    var id = track.id,
                        trackRow =
                                $(this.options.formId)
                                        .getElement('li.track a[data-id=' + id
                                                + ']');
                    trackRow.destroy();

                    // remove from data
                    if (this.data) {
                        for (var i = 0, len = this.data.tracks.length; i < len; i++) {
                            if (this.data.tracks[i].id == id) {
                                this.data.tracks.splice(i, 1);
                                break;
                            }
                        }
                    }
                }.bind(this),
                onCancel : function() {}
            });
        },

        /**
         * Clears track URL input
         */
        clearTrack : function() {
            $('trackurl').set('value', '');
        },

        /**
         * Renders playlist into template
         * 
         * @param {Element}
         *            container
         * @param {Boolean}
         *            [edit] Edit mode
         */
        render : function(container, edit, user) {
            // edit is passed directly or defined by playlist data
            edit =
                    (typeof edit !== "undefined") ? edit
                            : (!this.data || !this.widget);
            var tpl =
                    $(this.options[(edit ? 'edit' : 'view') + 'Tpl'])
                            .get('html'),
                rendered = Mustache.render(tpl, this.data),
                parentContainer = container.getParent(),
                playlist = this;
            this.container = container;
            container.set('html', rendered);

            // show/hide widget
            if (edit) {
                parentContainer.removeClass('view').addClass('edit');
            } else {
                parentContainer.removeClass('edit').addClass('view');
            }

            if (this.data && this.widget) {
                this.initWidget();
            }

            // activate
            this.container.getElements('*[data-action]').addEvent('click',
                    function(evt) {
                        evt.stop();
                        playlist[this.getProperty('data-action')](playlist
                                .getDataFromTemplate(this));
                    });
        },

        /**
         * Inits playlist widget
         */
        initWidget : function() {
            this.widget.load(this.data.uri, Object
                            .clone(this.options.widgetOptions));
            // this.widget.bind(SC.Widget.Events.READY,
            // this.onWidgetLoad.bind(this)
        },

        /**
         * Gets track info from template
         * 
         * @param {Element}
         *            el
         */
        getDataFromTemplate : function(el) {
            var action = el.getProperty('data-action'),
                data = {};
            switch (action) {
                case 'removeTrack' :
                    data.id = el.getParent().getProperty('data-id');
                    this.data.tracks.each(function(item) {
                                if (item.id == data.id) {
                                    data = item;
                                }
                            });
                    break;
                case 'addTrack' :
                    data.url = el.getPrevious('input').get('value');
                    break;
                default :
                    break;
            }
            // console.debug(data);
            return data;
        },

        /**
         * Destroys and removes playlist
         */
        destroy : function(callback) {
            callback = callback || function() {}, data = this.data;
            var modal = new Modal({
                textMessage : 'Are you sure you want to delete playlist \''
                        + this.data.title + '\'?',
                textHeader : 'Playlist deletion',
                onAccept : function() {
                    SC.delete(data.uri, function() {
                        exports.fireEvent('playlistDeleted', ['deleted', data]);
                    });
                }.bind(this),
                onCancel : function() {}
            });
        },

        /**
         * Saves playlist to SC
         */
        save : function() {
            var form = $('playlist-edit'),
                data = {
                    tracks : this.getTracksDataFromForm(form),
                    title : form.title.get('value'),
                    description : form.description.get('value')
                };

            // console.debug(data);

            // existing set
            if (this.data && this.data.id) {
                SC.put(this.data.uri, {
                            playlist : data
                        }, this.onSaved.bind(this));
            } else {
                // new set, at least there must be a title
                if (data.title) {
                    SC.post('/playlists', {
                                playlist : Object.merge(data, {
                                            sharing : 'private',
                                            user : this.user
                                        })
                            }, this.onCreated.bind(this));
                } else {
                    var handler = function() {
                        form.title.focus();
                    },
                        modal = new Modal({
                            textHeader : 'Error',
                            textMessage : 'You haven\'t filled out the title for the playlist',
                            onAccept : handler,
                            onCancel : handler
                        });
                }
            }
        },

        /**
         * Playlist save callback
         * 
         * @param {Object}
         *            playlist
         * @param {Object|Null}
         *            error
         */
        onSaved : function(playlist, error) {
            if (error) {
                var empty = function() {},
                    modal = new Modal({
                                textHeader : 'Error',
                                textMessage : error.message,
                                onAccept : empty,
                                onCancel : empty
                            });
            } else {
                this.data = playlist;
                // .debug('retrieved', playlist);
                this.render(this.container);
                exports.fireEvent('playlistChanged', ['changed', playlist]);
            }
        },

        /**
         * Playlist creation handler
         * 
         * @param {Object}
         *            playlist
         * @param {Object|Null}
         *            error
         */
        onCreated : function(playlist, error) {
            if (error) {
                var empty = function() {},
                    modal = new Modal({
                                textHeader : 'Error',
                                textMessage : error.message,
                                onAccept : empty,
                                onCancel : empty
                            });
            } else {
                this.data = playlist;
                // console.debug('retrieved', playlist);
                this.render(this.container);
                exports.fireEvent('playlistCreated', ['added', playlist]);
            }
        },

        /**
         * Serializes track data from form.
         * 
         * @param {Element}
         *            form
         * @return {Oject} data
         */
        getTracksDataFromForm : function(form) {
            var tracks = form.getElements('li.track a'),
                data = [];
            for (var i = 0, len = tracks.length; i < len; i++) {
                data.push({
                            id : tracks[i].getProperty('data-id')
                        });
            }
            return data;
        },

        /**
         * Switches edit mode on
         */
        edit : function() {
            this.render(this.container, true);
        },

        /**
         * Plays playlist
         */
        play : function() {
            this.widget && this.widget.play();
        },

        /**
         * Pauses playback
         */
        pause : function() {
            this.widget && this.widget.pause();
        }
    });

})(window);
