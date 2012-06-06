(function(exports) {

    /**
     * @class App
     * @lends App#
     * @description Main application class.
     */
    var App = new Class({

                options : {
                    playlists : {
                        container : 'playlists-nav',
                        tpl : 'playlists-tpl'
                    }
                },

                /**
                 * User account data, received from the api
                 * 
                 * @type Object
                 */
                user : null,

                /**
                 * Playlist data
                 * 
                 * @type Array
                 */
                playlists : [],

                /**
                 * Main application class
                 * 
                 * @constructor
                 * @constructs
                 * @param {Object}
                 *            options
                 */
                initialize : function(options) {
                    $('sc-connect').addEvent('click', this.connect.bind(this));
                },

                /**
                 * Connects app to user account
                 */
                connect : function() {
                    // initiate auth popup
                    SC.connect(function() {
                                SC.get('/me', this.onConnect.bind(this));
                            }.bind(this));
                },

                /**
                 * Connection success handler
                 * 
                 * @param {Object}
                 *            account
                 * @param {Object|Null}
                 *            error
                 */
                onConnect : function(account, error) {
                    if (!error) {
                        this.user = account;

                        // put welcome screen
                        var splash = $('splash'),
                            screen = splash.getElementById('welcome-screen'),
                            widgetFrame = $('player-frame');
                        screen.set('html', screen.get('html')
                                        .substitute(account));
                        this.goToScreen('welcome');

                        // put user badge
                        var badge = $('user-badge');
                        badge.set('html', badge.innerHTML.replace('{user}',
                                        account.username));
                        badge.removeClass('hide').setProperty('href',
                                account.permalink_url);
                        $('sc-cr').addEvent('click',
                                this.playlistRouter.bind(this))

                        // load playlists
                        if (account.playlist_count
                                || account.private_playlists_count) {
                            this.loadPlaylists(this.renderPlaylists);
                        }

                        this.widget = exports.widget = SC.Widget(widgetFrame);
                        this.widget._frame = widgetFrame;

                        var updateHandler = this.updatePlaylists.bind(this);
                        exports.addEvents({
                                    'playlistDeleted' : updateHandler,
                                    'playlistChanged' : updateHandler,
                                    'playlistCreated' : updateHandler
                                });
                    }
                },

                /**
                 * Updates paylists count
                 * 
                 * @param {Number}
                 *            number Number of playlists
                 */
                updatePlayListsCount : function(number) {
                    $('playlists-count').set('html', number);
                },

                /**
                 * Playlists update handler, reloads navigation and updates
                 * data.
                 * 
                 * @param {String}
                 *            type
                 * @param {Object}
                 *            data
                 */
                updatePlaylists : function(action, data) {
                    var len = this.playlists.length, i;
                    switch (action) {
                        case 'deleted' :
                            for (i = 0; i < len; i++) {
                                if (this.playlists[i].id == data.id) {
                                    this.playlists.splice(i, 1);
                                    break;
                                }
                            }
                            this.goToScreen('welcome');
                            break;
                        case 'changed' :
                            for (i = 0; i < len; i++) {
                                if (this.playlists[i].id == data.id) {
                                    this.playlists[i] = data;
                                    break;
                                }
                            }
                            break;
                        case 'added' :
                            this.playlists.push(data);
                            break;
                        default :
                            break;
                    }
                    this.renderPlaylists(this.playlists);
                },

                /**
                 * Switches app screens by passed id.
                 * 
                 * @param {String}
                 *            screen
                 */
                goToScreen : function(screen) {
                    $$('div.screen').each(function(container) {
                                var classString = 'screen';
                                if (container.id.indexOf(screen) === -1) {
                                    classString += ' hide';
                                }
                                // console.debug(container, screen, classString);
                                container.set('class', classString);
                            });
                },

                /**
                 * Loads user playlists data
                 * 
                 * @param {Function}
                 *            callback
                 */
                loadPlaylists : function(callback) {
                    SC.get('/me/playlists', function(playlists) {
                                this.playlists = playlists;
                                callback.call(this, playlists);
                            }.bind(this));
                },

                /**
                 * Renders playlists in the sidebar
                 * 
                 * @param {Array}
                 *            playlists
                 */
                renderPlaylists : function(playlists) {
                    var tpl = $(this.options.playlists.tpl).get('html'),
                        rendered = Mustache.render(tpl, {
                                    count : playlists.length,
                                    playlists : playlists
                                }),
                        container = $(this.options.playlists.container);
                    // console.debug(playlists, playlists.length, rendered)

                    container.set('html', rendered);
                    // events delegation
                    container.getElements('li a').addEvent('click',
                            this.playlistRouter.bind(this));
                },

                /**
                 * Routes playlist action events.
                 * 
                 * @param {Event}
                 *            evt
                 */
                playlistRouter : function(evt) {
                    var target = evt.target,
                        action =
                                target.getProperty('data-action')
                                        || target.getParent()
                                                .getProperty('data-action'), id,
                        data = null;

                    // get desired action
                    if (action) {
                        if (action !== 'add') {
                            id =
                                    target.getProperty('data-id')
                                            || target.getParent('a[data-id]')
                                                    .getProperty('data-id');
                            data = this.getPlaylistDataById(id);
                        }
                        this[action + 'Playlist'](data);
                    }

                    // stop & prevent default
                    evt.stop();
                },

                /**
                 * Gets playlist data from last API response by PL id.
                 * 
                 * @param {String}
                 *            id
                 * @return {Object} data
                 */
                getPlaylistDataById : function(id) {
                    var data = null;
                    for (var i = 0, len = this.playlists.length; i < len; i++) {
                        if (this.playlists[i].id == id) {
                            data = this.playlists[i];
                            break;
                        }
                    }
                    return data;
                },

                /**
                 * Opens playlist for playback and editing
                 * 
                 * @param {Object}
                 *            data
                 */
                openPlaylist : function(data) {
                    // console.debug('playlist data:', data);
                    this.goToScreen('playlist');
                    (new Playlist(data, this.widget, this.user))
                            .render($('playlist-container'));
                },

                /**
                 * Adds new playlist
                 */
                addPlaylist : function() {
                    // console.debug(data);
                    this.goToScreen('playlist');
                    (new Playlist(null, this.widget, this.user)).render(
                            $('playlist-container'), true);
                },

                /**
                 * Deletes playlists
                 * 
                 * @param {Object}
                 *            data
                 */
                destroyPlaylist : function(data) {
                    // console.debug(data);
                    (new Playlist(data, null, this.user)).destroy(function() {
                                this.goToScreen('welcome');
                            });
                }
            });

    // init
    new App();

})(window);
