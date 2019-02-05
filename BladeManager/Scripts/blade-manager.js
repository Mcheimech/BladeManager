/// <reference path="typings/blade-manager/blade-manager.d.ts" />

var bladeManager = bladeManager || (function () {

    var name = 'Blade manager';
    var version = '0.98 alpha';

    /** @type {boolean} */
    var initialized = false;

    /** @type {Number} */
    var index = 0;

    /** @type {Array<Blade>} */
    var blades = [];

    /** @type {Blade} */
    var focusedBlade = null;

    /** @type {Node} */
    var targetNode = document.getElementsByClassName('blades-container')[0];

    /** @type {Node} */
    var targetBreadCrumb = document.getElementsByClassName('breadcrumb-item active')[0];

    /** @type {any} */
    var focusTimeout = null;

    var defaultTemplate =
        '<div class="blade-window col-md-6" tabindex="-1">' +
            '<div class="blade-wrapper">' +
                '<div class="blade-header">' +
                    '<div class="blade-title"></div>' +
                    '<div class="blade-buttons">' +
                        '<a href="javascript://" class="refresh-blade" title="Refresh"><i></i></a>' +
                        '<a href="javascript://" class="restore-blade" title="Restore"><i></i></a>' +
                        '<a href="javascript://" class="close-blade" title="Close"><i></i></a>' +
                    '</div>' +
                    '<div class="clearfix"></div>' +
                '</div>' +
                '<div class="blade-toolbar btn-toolbar" role="toolbar"><div class="btn-group btn-group-sm mr-2" role="group"></div></div>' +
                '<div class="blade-content"></div>' +
                '<div class="blade-loader" title="Loading"><div class="blade-anim"></div></div>' +
            '</div>' +
        '</div>';
    var scrollRegex = /(auto|scroll)/;
    var host = document.location.protocol + "//" + document.location.host;

    /** @type {BladeSettings} */
    var defaults = {
        name: undefined,
        title: 'Untitled',
        backColor: 'white',
        headerBack: 'transparent',
        contentBack: 'transparent',
        oneInstance: true,
        canClose: true,
        fullWidth: false,
        propertiesBlade: false,
        addToUrl: true,
        canRestore: true,
        canRefresh: true,
        updateParent: true,
        formSuccessCallback: null,
        content: null,
        variables: {},
        toolbar: null, 
    }

    var getRandomColor = function () {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    var attachEvents = function () {

        if (bladeManager.horizontalScrolling) {
            $(targetNode).on('mousewheel wheel', function (event, delta) {
                var srcElement = event.originalEvent.target;
                var elementIndex = bladeManager.Blades.indexOf(getBlade($($(srcElement).closest('.blade-window')[0])));
                delta = event.originalEvent.deltaY > 0 ? -1 : 1;

                if (bladeManager.verbose) {
                    logToConsole({
                        'element': srcElement,
                        'elementIndex': elementIndex,
                        'delta': delta,
                        'scrollTop': srcElement.scrollTop,
                        'scrollHeight': srcElement.scrollHeight
                    });
                }

                var canScrollLeft = true;
                if ($(srcElement).closest('.blade-content').length > 0) {
                    var currentBlade = getBlade(srcElement);
                    if (currentBlade.settings.propertiesBlade)
                        return;

                    if (hasScrollBar(srcElement) && needToScroll(srcElement, delta))
                        return;

                    $(srcElement).parentsUntil('.blade-window').filter(function () {
                        if (hasScrollBar(this) && needToScroll(this, delta)) {
                            canScrollLeft = false;
                            return;
                        }
                    });
                }

                if (canScrollLeft) {
                    if (bladeManager.verbose)
                        logToConsole('Starting horizontal scroll');

                    if (!bladeManager.scrollToBlades)
                        this.parentElement.scrollLeft -= (delta * (blades.length * 10));
                    else {
                        var nextElementIndex = bladeManager.Blades.indexOf(focusedBlade) - delta;
                        var nextBlade = bladeManager.Blades[nextElementIndex];

                        if (nextBlade == undefined) {
                            if (delta === -1)
                                nextBlade = bladeManager.Blades[bladeManager.Blades.length - 1];
                            else
                                nextBlade = bladeManager.Blades[0];
                        }

                        if (bladeManager.verbose)
                            logToConsole('Scrolling to next blade: ', nextBlade);

                        _showBlade(nextBlade, false, nextBlade.settings.propertiesBlade);
                    }
                }
            });
        }

        $(targetNode).on('submit', 'form', function (e) {
            var objForm = this;
            var $form = $(objForm);
            var formAction = objForm.action;
            var submitActor = null;
            var $submitActors = $form.find('[type=submit]');

            if (objForm.getAttribute('data-ajax') != undefined && objForm.getAttribute('data-ajax') === 'true') {
                var _blade = getBlade(this);
                $(_blade.element).find('.blade-toolbar > .btn-group').empty();
                return;
            }

            $submitActors.click(function () {
                submitActor = this;
            });

            if (typeof e.originalEvent.explicitOriginalTarget != 'undefined') {
                submitActor = e.originalEvent.explicitOriginalTarget;
            } else if (typeof document.activeElement.value != 'undefined') {
                submitActor = document.activeElement;
            };

            if (undefined == submitActor) {
                submitActor = $submitActors[0];
            }

            e.preventDefault();
            if ($.validator !== undefined && $.validator.unobtrusive !== undefined) {
                $(this).removeData('validator');
                $(this).removeData('unobtrusiveValidation');
                $.validator.unobtrusive.parse(this);
                $(this).validate().settings.ignore = ".ignore";

                if (!$(this).valid())
                    return;
            }

            if (this.getAttribute('data-target') != undefined && this.getAttribute('data-target') === '_blade') {
                var defaultButton = document.getElementById(this.getAttribute('data-target'));

                if (defaultButton == undefined)
                    defaultButton = this.querySelectorAll('[type="button"]')[0];

                if (defaultButton != undefined)
                    defaultButton.click();

                return;
            }

            var formData = $(this).serializeArray();
            if (submitActor != undefined && submitActor.name != undefined && submitActor.name !== '')
                formData.push({ name: submitActor.name, value: submitActor.value });

            var contentType = 'application/x-www-form-urlencoded; charset=UTF-8';
            var processData = true;
            if (this.querySelectorAll('[type="file"]').length != 0) {
                contentType = false;
                processData = false;
                formData = new FormData(this);
            }

            $.ajax({
                url: formAction,
                type: 'POST',
                data: formData,
                contentType: contentType,
                processData: processData,
                headers: { 'x-custom-caller': 'blade-manager' },
                success: function (data) {
                    var currentBlade = getBlade(objForm);

                    if (currentBlade != undefined
                        && currentBlade.settings.parent
                        && currentBlade.settings.updateParent
                        && document.body.contains(currentBlade.settings.parent.element))
                        bladeManager.refreshBlade(null, currentBlade.settings.parent);

                    if (currentBlade != undefined && currentBlade.settings.formSuccessCallback !== null) {
                        currentBlade.settings.formSuccessCallback.call(currentBlade);
                    }

                    _removeBlade(currentBlade, true);
                },
                error: function (jqXHR, status, error) {
                    if (jqXHR.status === 403) {
                        document.location.href = '/Account/RefreshToken';
                        return;
                    } else if (jqXHR.status === 306) return;

                    var currentBlade = getBlade(objForm);

                    $(currentBlade.element).find('.blade-loader').hide();
                    bladeManager.replaceContent(currentBlade.element, jqXHR.responseText);
                },
                beforeSend: function () {
                    $(getBlade(objForm).element).find('.blade-loader').show();
                },
                complete: function () {
                    var _blade = getBlade(objForm);
                    if (_blade == undefined) return;

                    $(_blade.element).find('.blade-loader').hide();
                },
                statusCode: {
                    306: function (jqXHR) {
                        var currentBlade = getBlade(objForm);
                        if (currentBlade != undefined
                            && currentBlade.settings.parent
                            && currentBlade.settings.updateParent
                            && document.body.contains(currentBlade.settings.parent.element))
                            bladeManager.refreshBlade(null, currentBlade.settings.parent);

                        _removeBlade(currentBlade, true);
                        var bladeSettings = jqXHR.getResponseHeader('blade-settings');

                        if (bladeSettings != undefined) {
                            bladeSettings = JSON.parse(bladeSettings);

                            if (bladeSettings.content === 'jqXHR.responseText')
                                bladeSettings.content = jqXHR.responseText;

                            bladeManager.addBlade(bladeSettings);
                        }
                    }
                }
            });
        });

        $(targetNode).on('click', 'a[data-target="_blade"]', function (e) {
            e.preventDefault();
            e.stopPropagation();

            var href = this.href;
            var title = this.getAttribute('data-title');
            var isProperties = this.getAttribute('data-is-properties') != undefined ? this.getAttribute('data-is-properties').toBool() : false;
            var fullWidth = this.getAttribute('data-full-width') != undefined ? this.getAttribute('data-full-width').toBool() : false;
            var canRestore = this.getAttribute('data-can-restore') != undefined ? this.getAttribute('data-can-restore').toBool() : true;
            var canClose = this.getAttribute('data-can-close') != undefined ? this.getAttribute('data-can-close').toBool() : true;
            var canRefresh = this.getAttribute('data-can-refresh') != undefined ? this.getAttribute('data-can-refresh').toBool() : true;

            bladeManager.addBlade({
                content: {
                    url: href
                },
                title: title,
                propertiesBlade: isProperties,
                fullWidth: fullWidth,
                canClose: canClose,
                canRestore: canRestore,
                canRefresh: canRefresh
            });
        });

        $('.close-blade').on('click', function () {
            bladeManager.removeBlade(this);
        });

        $('.restore-blade').on('click', function () {
            bladeManager.restoreBlade(this);
        });

        $('.refresh-blade').on('click', function () {
            bladeManager.refreshBlade(this);
        });

        $('.blade-window').on('focusin', function (e) {
            if (bladeManager.verbose)
                logToConsole(e);

            focusedBlade = getBlade(e.target);
            if (targetBreadCrumb != undefined)
                targetBreadCrumb.textContent = focusedBlade.settings.title;
        });

        $('.blade-window').on('dblclick', function (e) {
            var nodeName = e.target.localName.toLowerCase();
            if (nodeName === 'input'
                || nodeName === 'select'
                || nodeName === 'button'
                || nodeName === 'a'
                || hasContentEditable(e.target))
                return;

            //Clear text selection
            if (window.getSelection) {
                if (window.getSelection().empty) {  // Chrome
                    window.getSelection().empty();
                } else if (window.getSelection().removeAllRanges) {  // Firefox
                    window.getSelection().removeAllRanges();
                }
            } else if (document.selection) {  // IE?
                document.selection.empty();
            }

            _showBlade(getBlade(e.target), false, false);
        });

        $('.blade-window').not('input,select,textarea').on('keyup', function (e) {
            if (bladeManager.verbose)
                logToConsole(e);

            var nodeName = e.target.localName.toLowerCase();
            if (nodeName === 'input'
                || nodeName === 'select'
                || nodeName === 'textarea')
                return;

            if (e.keyCode === 27 && !(e.altKey || e.ctrlKey || e.shiftKey || e.metaKey)) {
                e.preventDefault();

                var _blade;

                if ($(e.target).hasClass('blade-window'))
                    _blade = $(e.target).find('.close-blade');
                else
                    _blade = $(e.target).closest('.blade-window');

                if (_blade.length === 0)
                    return;

                bladeManager.removeBlade(_blade);
            }
        });
    };

    var detachEvents = function () {
        $(targetNode).off('mousewheel wheel');
        $(targetNode).off('submit', 'form');
        $(targetNode).off('click', 'a[data-target="_blade"]');
        $('.close-blade').off('click');
        $('.restore-blade').off('click');
        $('.refresh-blade').off('click');
        $('.blade-window').off('dblclick');
        $('.blade-window').off('focusin');
        $('.blade-window').off('keyup');
    };

    var hasContentEditable = function (element) {
        return $(element).parents("[contenteditable='true']").length > 0;
    }

    /**
     * @param {Blade} blade
     * @param {boolean} highlight
     * @param {boolean} keepInPlace
     */
    var _showBlade = function (blade, highlight, keepInPlace) {
        var bladeElement = $(blade.element);

        if (!keepInPlace) {
            var leftPosition = bladeElement.position().left;
            var contentBody = document.getElementsByClassName('content-body')[0];

            if (bladeManager.verbose)
                logToConsole('Scrolling to left: ', leftPosition);

            if (contentBody != undefined && contentBody.scroll != undefined)
                contentBody.scroll({ left: leftPosition, behavior: (bladeManager.smoothScrolling ? 'smooth' : 'instant') });
            else {
                contentBody.style.scrollBehavior = (bladeManager.smoothScrolling ? 'smooth' : 'instant');
                contentBody.scrollLeft = leftPosition;

                window.setTimeout(function (element) {
                    element.style.scrollBehavior = 'inherit';
                }, 1000, contentBody);
            }
        }

        if (focusTimeout !== null)
            window.clearTimeout(focusTimeout);

        focusTimeout = window.setTimeout(function (element) {
            element.focus();
        }, 1000, bladeElement);

        if (highlight) {
            var originalBackground = bladeElement.css('backgroundColor');

            bladeElement.css('-webkit-transition', 'background 1s');
            bladeElement.css('-moz-transition', 'background1s');
            bladeElement.css('-o-transition', 'background 1s');
            bladeElement.css('transition', 'background 1s');

            bladeElement.css('backgroundColor', '#ffff99');
            window.setTimeout(function (element, backColor) {
                element.css('backgroundColor', backColor);
            }, 1000, bladeElement, originalBackground);
        }

        focusedBlade = blade;
        if (targetBreadCrumb != undefined)
            targetBreadCrumb.textContent = blade.settings.title;
    };

    var style = function (node, prop) {
        return getComputedStyle(node, null).getPropertyValue(prop);
    };

    var overflow = function (node) {
        return style(node, 'overflow') + style(node, 'overflow-y') + style(node, 'overflow-x');
    };

    var scroll = function (node) {
        return scrollRegex.test(overflow(node));
    };

    var hasScrollBar = function (element) {
        return (element.scrollHeight > element.clientHeight && (scroll(element)));
    };

    var needToScroll = function (element, delta) {
        if (bladeManager.verbose) {
            logToConsole({
                'delta': delta,
                'hasScroller': hasScrollBar(element),
                'scroll height': element.scrollHeight,
                'height': element.clientHeight,
                'element': element
            });
        }

        if ((delta === 1 && element.scrollTop === 0) ||
            (delta === -1 && (element.scrollTop + element.clientHeight) >= element.scrollHeight)) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Return the parent 'Blade' object of the caller element
     * @param {HTMLElement} caller
     * @returns {Blade}
     */
    var getBlade = function (caller) {
        var $bladeElement = $(caller).closest('.blade-window');
        var returnVal;
        blades.forEach(function (_blade, index) {
            if (_blade.name === $bladeElement.data('name')) {
                returnVal = _blade;
                return;
            }
        });
        return returnVal;
    };

    var openUrlBlades = function () {
        if (document.location.hash === '')
            return;

        var urlHash = document.location.hash.substring(1);
        var urlBlades = decodeURIComponent(urlHash).toJSON();

        $.each(urlBlades, function (index, _settings) {
            _settings.addToUrl = false;

            if (!bladeExists(_settings, false)) {
                if (typeof _settings.content === 'string') return;
                if (_settings.content.url.indexOf(host) != 0 && _settings.content.url.indexOf('/') != 0) return;

                bladeManager.addBlade(_settings);
            }
        });
    };

    var bladeExists = function (settings, goToBlade) {
        var returnVal = false;

        $.each(blades, function (index, blade) {
            var _blade = blade.element;
            if (_blade.getAttribute('data-url') === JSON.stringify(settings.content)) {
                if (bladeManager.verbose)
                    console.warn('A blade with the same url is already opened!');

                if (goToBlade)
                    _showBlade(blade, true, settings.propertiesBlade);

                returnVal = true;
            }
        });

        return returnVal;
    }

    var setAsSortable = function () {
        return;

        if ($(targetNode).sortable('instance') !== undefined)
            $(targetNode).sortable('destroy');

        $(targetNode).sortable({
            items: 'div.blade-window:not([data-closable=false]):not(.properties-blade)',
            handle: '.blade-header',
            containment: targetNode,
            placeholder: 'blade-placeholder ui-corner-all col-md-6',
            helper: 'clone'
        });
    }

    var cleanSettings = function (settings) {
        if (settings['addToUrl'] === true
            && (settings['content']['type'] != undefined && settings['content']['type'].toLowerCase() === 'post')
            && settings['content']['data'] != undefined)
            delete settings['content']['data'];

        delete settings['name'];
        delete settings['parent'];
        delete settings['addToUrl'];
        delete settings['toolbar'];
        delete settings['variables'];

        Object.keys(settings).forEach(function (key, index) {
            if (key === 'content') return;

            if (settings[key] == defaults[key])
                delete settings[key];
        });

        return settings;
    }

    var _removeBlade = function (blade, forceClose) {
        var $blade = (blade.element.nodeName) ? $(blade.element) : blade.element;
        if ($blade.data('closable') === false && forceClose === false) {
            if (bladeManager.verbose)
                console.warn('You\'re trying to close a sticky blade!');

            return;
        }

        var indexRm;
        $.each(blades, function (index, _blade) {
            if ($(_blade.element).data('name') === $blade.data('name'))
                indexRm = index;
        });
        blades.splice(indexRm, 1);
        $blade.remove();
        bladeManager.Blades[bladeManager.Blades.length - 1].element.focus();

        var _settings = cleanSettings(blade.settings);

        var urlHash = decodeURIComponent(document.location.hash.substring(1)).toJSON();

        var urlExists = false;
        var urlIndex = -1;
        urlHash.forEach(function (url, index) {
            if (JSON.stringify(url.content).toLowerCase() === JSON.stringify(_settings.content).toLowerCase()) {
                urlExists = true;
                urlIndex = index;
                return;
            }
        });
        if (urlExists) {
            urlHash.splice(urlIndex, 1);
            document.location.hash = encodeURIComponent(JSON.stringify(urlHash));
        }

        setAsSortable();
        updateBreadCrumb();
    }

    var manupilateContent = function (contentElement) {

        if (typeof hideContent === 'function') {
            contentElement.find('.sensitive').each(function (index, el) {
                hideContent(el);
            });
        }

        if ($.fn.datepicker != undefined) {
            contentElement.find('input[type="date"]')
                .attr('type', 'text')
                .attr('placeholder', 'yyyy-mm-dd')
                .attr('autocomplete', 'off')
                .datepicker({
                    format: 'yyyy-mm-dd',
                    todayHighlight: true,
                    autoclose: true
                });
        }

        if ($.fn.daterangepicker != undefined) {
            contentElement.find('input[type="datetime"]')
                .attr('type', 'text')
                .attr('placeholder', 'yyyy-MM-dd HH:mm:ss')
                .attr('autocomplete', 'off')
                .daterangepicker({
                    singleDatePicker: true,
                    showDropdowns: true,
                    timePicker: true,
                    autoApply: true,
                    autoUpdateInput: false,
                    applyButtonClasses: 'btn btn-outline-dark shadow-none rounded-0',
                    cancelButtonClasses: 'btn btn-outline-danger shadow-none rounded-0',
                    locale: {
                        format: 'YYYY-MM-DD HH:mm:ss'
                    }
                }).on('apply.daterangepicker', function (ev, picker) {
                    $(this).val(picker.startDate.format(picker.locale.format));
                });
        }

        if ($.fn.summernote != undefined) {
            contentElement.find('[data-role="rte-editor"]').each(function (index, item) {
                var editorHeight = $(item).data('height') || 150;
                var toolbarMode = $(item).data('toolbar') || 'full';
                if (toolbarMode === 'mini')
                    var rteToolbar = [
                        ['style', ['bold', 'italic', 'underline', 'clear']],
                        ['font', ['strikethrough', 'superscript', 'subscript']],
                        ['fontsize', ['fontsize']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['height', ['height']]
                    ];
                else
                    rteToolbar = false;

                $(item).summernote({
                    toolbar: rteToolbar,
                    height: editorHeight,
                    tooltip: false,
                    tabsize: 0
                });
            });
            delete $.summernote.options.keyMap.pc.TAB;
            delete $.summernote.options.keyMap.mac.TAB;
            delete $.summernote.options.keyMap.pc['SHIFT+TAB'];
            delete $.summernote.options.keyMap.mac['SHIFT+TAB'];
        }

        contentElement.scrollTop(0);
    }

    var updateBreadCrumb = function () {
        if (targetBreadCrumb == undefined || !bladeManager.bladesNavigator)
            return;

        var parentElement = targetBreadCrumb.parentElement;

        if (parentElement.querySelectorAll('#bladeManager-nav').length == 0) {
            var dropdownBtn = document.createElement('a');
            dropdownBtn.href = 'javascript://';
            dropdownBtn.classList = 'shadow-none rounded-0 waves-effect waves-light dropdown-toggle dropdown-toggle-split';
            dropdownBtn.setAttribute('data-toggle', 'dropdown');
            dropdownBtn.setAttribute('aria-haspopup', 'true');
            dropdownBtn.setAttribute('aria-expanded', 'false');

            var dropdownSpn = document.createElement('span');
            dropdownSpn.classList = 'sr-only';

            var dropdownTxt = document.createTextNode('Toggle Dropdown');
            dropdownSpn.appendChild(dropdownTxt);
            dropdownBtn.appendChild(dropdownSpn);

            parentElement.appendChild(dropdownBtn);

            var dropdownList = document.createElement('div');
            dropdownList.classList = 'dropdown-menu';
            dropdownList.id = 'bladeManager-nav';
            dropdownList.style.zIndex = 1000;
            parentElement.appendChild(dropdownList);

            targetBreadCrumb.setAttribute('data-toggle', 'dropdown');
            targetBreadCrumb.setAttribute('aria-haspopup', 'true');
            targetBreadCrumb.setAttribute('aria-expanded', 'false');
            targetBreadCrumb.style.cursor = 'pointer';
        }

        var dropdownList = parentElement.querySelectorAll('#bladeManager-nav')[0];
        dropdownList.innerHTML = '';

        blades.forEach(function (blade, index) {
            var dropdownItem = document.createElement('a');
            dropdownItem.href = 'javascript://';
            dropdownItem.classList = 'dropdown-item';
            dropdownItem.addEventListener('click', function (e) {
                _showBlade(blade, true, blade.settings.propertiesBlade);
            });

            var dropdownText = document.createTextNode(blade.settings.title);
            dropdownItem.appendChild(dropdownText);

            dropdownList.appendChild(dropdownItem);
        });
    }

    var logToConsole = function (message) {
        var objDate = new Date();

        console.log(
            objDate.getFullYear() + '-' +
            objDate.getMonth() + '-' +
            objDate.getDate() + ' ' +
            objDate.getHours() + ':' +
            objDate.getMinutes() + ':' +
            objDate.getSeconds(), message);
    }

    String.prototype.toBool = function () {
        var a = {
            'true': true,
            'false': false
        };
        return a[this];
    }

    String.prototype.toJSON = function () {
        if (this.toString() === '')
            return JSON.parse('[]');
        else
            return JSON.parse(this);
    }

    return {
        /** @type {boolean} */
        verbose: false,

        /** @type {boolean} */
        horizontalScrolling: true,

        /** @type {boolean} */
        scrollToBlades: false,

        /** @type {boolean} */
        smoothScrolling: true,

        /** @type {boolean} */
        bladesNavigator: true,

        /** @type {string} */
        get name() { return name },

        /** @type {string} */
        get version() { return version },

        /** @type {Array<Blade>} */
        get Blades() { return blades; },

        /**
         * @param {BladeSettings} settings
         * @returns {Blade}
         */
        addBlade: function (settings) {
            if (!initialized)
                bladeManager.init();

            if (settings.content == undefined)
                throw 'Cannot add an empty blade, a "content" object or HTML string must be passed!';

            var child = $(defaultTemplate)[0];

            settings = bladeManager.setSettings(settings, child);

            var haltCreation = false;
            if (typeof settings.content === 'object') {
                child.setAttribute('data-url', JSON.stringify(settings.content));
                if (settings.oneInstance) {
                    haltCreation = bladeExists(settings, true);
                }
            }
            if (haltCreation) return;

            try {
                settings.parent = null;
                var originalArgs = arguments.callee.caller ? arguments.callee.caller.arguments : [];
                for (var i = 0; i < originalArgs.length; i++) {
                    var args = originalArgs[i];
                    if (typeof args === 'object' && ((args.nodeName || args.target) || (args.settings && args.element))) {
                        if (args.nodeName)
                            parentBlade = getBlade(args);
                        else if (args.target)
                            parentBlade = getBlade(args.target);
                        else if (args.settings) {
                            settings.parent = args;
                            break;
                        }

                        settings.parent = parentBlade;

                        break;
                    }
                }
            } catch (ex) {
                logToConsole(ex);
            }

            targetNode.appendChild(child);
            var objBlade = {
                'name': settings.name,
                settings,
                'element': child,
                index: index
            };
            blades.push(objBlade);

            var content = settings.content;
            if (typeof content !== 'undefined' && content !== null) {
                this.replaceContent(child, content);
            }

            if (settings.addToUrl) {
                var _settings = JSON.parse(JSON.stringify(settings));

                _settings = cleanSettings(_settings);

                var urlHash = decodeURIComponent(document.location.hash.substring(1)).toJSON();
                var urlExists = false;
                urlHash.forEach(function (url, index) {
                    if (JSON.stringify(url.content).toLowerCase() === JSON.stringify(_settings.content).toLowerCase()) {
                        urlExists = true;
                        return;
                    }
                });
                if (!urlExists) {
                    urlHash.push(_settings);
                    document.location.hash = encodeURIComponent(JSON.stringify(urlHash));
                }
            }

            _showBlade(objBlade, false, settings.propertiesBlade);

            setAsSortable();
            index++;
            updateBreadCrumb();

            return objBlade;
        },

        /**
         * @param {string | Element} caller
         * @param {Blade} blade
         */
        removeBlade: function (caller, blade) {
            if (caller != undefined)
                blade = bladeManager.resolveBlade(caller);

            if (blade == undefined || blade.element == undefined) return;

            _removeBlade(blade, false);
        },

        /**
         * @param {string | Element} caller
         * @param {Blade} blade
         */
        restoreBlade: function (caller, blade) {
            if (caller != undefined)
                blade = bladeManager.resolveBlade(caller);

            if (blade == undefined || blade.element == undefined) return;

            var element = blade.element;

            if (element.getAttribute('data-restore').toBool() === false) {
                if (bladeManager.verbose)
                    console.warn('You\'re trying to restore a non-resizable blade!');
            }

            bladeManager.setSettings({ fullWidth: !blade.settings.fullWidth }, blade);

            _showBlade(blade);
        },

        /**
         * @param {BladeSettings} settings
         * @param {Blade} blade
         * @returns {BladeSettings}
         */
        setSettings: function (settings, blade) {
            if (blade == undefined)
                return;

            var child;
            if (blade['settings'] != undefined) {
                var currentSettings = blade.settings;
                var appendToolbar = false;
                if (settings['toolbar'] != undefined && blade.settings['toolbar'] != undefined)
                    appendToolbar = true;

                child = blade.element;
                Object.keys(settings).forEach(function (property, index) {
                    if (appendToolbar && property === 'toolbar') {
                        settings[property].buttons.forEach(function (item) {
                            currentSettings[property].buttons.push(item);
                        });
                    } else
                        currentSettings[property] = settings[property];
                });

                settings = currentSettings;
            } else {
                child = blade;
                $(child).find('.blade-loader').attr('id', 'loader_' + index.toString());
            }

            settings.title = settings.title || defaults.title;
            settings.oneInstance = settings.oneInstance == undefined ? defaults.oneInstance : settings.oneInstance;
            settings.propertiesBlade = settings.propertiesBlade == undefined ? defaults.propertiesBlade : settings.propertiesBlade;
            settings.canClose = settings.canClose == undefined ? defaults.canClose : settings.canClose;
            settings.canRestore = settings.propertiesBlade ? false : settings.canRestore == undefined ? defaults.canRestore : settings.canRestore;
            settings.canRefresh = settings.canRefresh == undefined ? defaults.canRefresh : settings.canRefresh;
            settings.fullWidth = settings.fullWidth == undefined ? defaults.fullWidth : settings.fullWidth;
            settings.backColor = settings.backColor === 'random' ? getRandomColor() : settings.backColor || defaults.backColor;
            settings.headerBack = settings.headerBack === 'random' ? getRandomColor() : settings.headerBack || defaults.headerBack;
            settings.contentBack = settings.contentBack === 'random' ? getRandomColor() : settings.contentBack || defaults.contentBack;
            settings.addToUrl = settings.addToUrl == undefined ? defaults.addToUrl : settings.addToUrl;
            settings.updateParent = settings.updateParent == undefined ? defaults.updateParent : settings.updateParent;
            settings.formSuccessCallback = settings.formSuccessCallback == undefined ? defaults.formSuccessCallback : settings.formSuccessCallback;
            settings.name = settings.name || `blade${index}`;

            $(child).find('.blade-title').text(settings.title);
            $(child).css('background-color', settings.backColor);
            $(child).find('.blade-header').css('background-color', settings.headerBack);
            $(child).find('.blade-content').css('background-color', settings.contentBack);

            if (!child.hasAttribute('data-index'))
                child.setAttribute('data-index', index);

            if (!child.hasAttribute('data-name'))
                child.setAttribute('data-name', settings.name);

            child.setAttribute('data-closable', settings.canClose);
            child.setAttribute('data-restore', settings.canRestore);
            child.setAttribute('data-refresh', settings.canRefresh);

            $(child).find('.close-blade').css('display', (!settings.canClose ? 'none' : ''));
            $(child).find('.restore-blade').css('display', (!settings.canRestore ? 'none' : ''));
            $(child).find('.refresh-blade').css('display', (!settings.canRefresh ? 'none' : ''));

            if (settings.fullWidth) {
                $(child).addClass('full-blade');
            } else if (settings.propertiesBlade) {
                $(child).addClass('col-md-3');
                $(child).addClass('properties-blade');
                $(child).removeClass('col-md-6');
                $(child).removeClass('full-blade');
            } else {
                $(child).removeClass('col-md-3');
                $(child).removeClass('properties-blade');
                $(child).removeClass('full-blade');
                $(child).addClass('col-md-6');
            }

            var bladeToolbar = $(child).find('.blade-toolbar');
            var bladeContent = $(child).find('.blade-content');
            var defaultGroup = bladeToolbar.children('.btn-group');

            if (settings.toolbar && typeof settings.toolbar === 'object') {
                bladeToolbar.css('display', 'block');
                defaultGroup.empty();

                settings.toolbar.buttons.forEach(function (item) {
                    var objButton = document.createElement('button');
                    objButton.type = 'button';
                    objButton.onclick = item.callback || 'return false;';
                    objButton.classList = item.classList || 'btn btn-outline-dark shadow-none rounded-0 waves-effect waves-light';

                    if (item.enabled != undefined && item.enabled == false)
                        objButton.setAttribute('disabled', 'disabled');

                    if (item.id != undefined)
                        objButton.id = item.id;

                    objButton.appendChild(document.createTextNode(item.text || ''));

                    if (item.icon != undefined) {
                        objButton.insertAdjacentHTML('afterbegin', '<i class="md ' + item.icon + '"></i> ');
                    }

                    defaultGroup.append(objButton);
                });
            } else {
                defaultGroup.empty();
                bladeToolbar.css('display', 'none');
            }

            settings.variables = settings.variables || defaults.variables;

            return settings;
        },

        /**
         * @param {string | Element} caller
         * @param {Blade} blade
         */
        refreshBlade: function (caller, blade) {
            if (caller != undefined)
                blade = bladeManager.resolveBlade(caller);

            if (blade == undefined || blade.element == undefined) return;

            this.replaceContent(blade.element, blade.settings.content);

            _showBlade(blade, true, blade.settings.propertiesBlade);
        },

        /**
         * @param {string | Element} caller
         * @returns {Blade}
         */
        resolveBlade: function (caller) {
            if (typeof caller === 'string') {
                if (caller.charAt(0) === '#' || caller.charAt(0) === '.')
                    caller = $(caller)[0];
                else
                    caller = document.getElementById(caller);
            }

            return getBlade(caller);
        },

        /**
         * @param {Element} blade
         * @param {BladeContent | String} content
         */
        replaceContent: function (blade, content) {
            var contentElement = $(blade).find('.blade-content');

            bladeManager.setSettings({ toolbar: null }, bladeManager.resolveBlade(blade));

            if (typeof content === 'string') {

                contentElement.html(content);

                manupilateContent(contentElement);

            } else if (typeof content === 'object') {
                $.ajax({
                    url: content.url,
                    type: content.type || 'get',
                    data: content.data || {},
                    dataType: content.dataType || null,
                    contentType: content.contentType,
                    headers: { 'x-custom-caller': 'blade-manager' },
                    success: function (data) {
                        contentElement.html(data);
                        manupilateContent(contentElement);
                    },
                    error: function (jqXHR, errorThrown) {
                        if (jqXHR.status == 403) {
                            document.location.href = '/Account/RefreshToken';
                            return;
                        } else if (jqXHR.status === 306) return;

                        contentElement.html(jqXHR.statusText);
                    },
                    beforeSend: function () {
                        $(blade).find('.blade-loader').show();
                    },
                    complete: function () {
                        $(blade).find('.blade-loader').hide();
                    },
                    statusCode: {
                        306: function (jqXHR) {
                            contentElement.html(jqXHR.responseText);
                            manupilateContent(contentElement);
                        }
                    }
                });
            }
        },

        /**
         * @param {Blade} blade
         */
        showBlade: function (blade) {
            _showBlade(blade, true, blade.settings.propertiesBlade);
        },

        /**
         * @param {string | Element} caller
         * @param {Blade} blade
         */
        showLoader: function (caller, blade) {
            if (caller != undefined)
                blade = bladeManager.resolveBlade(caller);

            if (blade == undefined || blade.element == undefined) return;

            $(blade.element).find('.blade-loader').show();
        },

        /**
         * @param {string | Element} caller
         * @param {Blade} blade
         */
        hideLoader: function (caller, blade) {
            if (caller != undefined)
                blade = bladeManager.resolveBlade(caller);

            if (blade == undefined || blade.element == undefined) return;

            $(blade.element).find('.blade-loader').hide();
        },

        /**
         * @param {string | Element} caller
         * @param {Blade} blade
         * @returns {object}
         */
        getVariables: function (caller, blade) {
            if (caller != undefined)
                blade = bladeManager.resolveBlade(caller);

            if (blade == undefined || blade.element == undefined) return;

            return blade.settings.variables;
        },

        /**
         * @param {Element} target?
         * @param {Element} breadCrumb?
         * @param {boolean} enableBladesNavigator?
         * @param {boolean} enableHorizontalScrolling?
         * @param {boolean} enablesScrollToBlades?
         * @param {boolean} enableSmoothScrolling?
         */
        init: function (target, breadCrumb, enableBladesNavigator, enableHorizontalScrolling, enableScrollToBlades, enableSmoothScrolling) {
            console.log(`${name} - version: ${version}`);
            targetNode = target || targetNode;
            targetBreadCrumb = breadCrumb || targetBreadCrumb;

            var config = { attributes: true, childList: true, subtree: true };
            var callback = function (mutationsList) {
                if (bladeManager.verbose)
                    logToConsole(mutationsList);

                mutationsList.filter(function (e) {
                    if ($(e.addedNodes).filter('.blade-window').length > 0 || $(e.removedNodes).filter('.blade-window').length > 0) {
                        if (bladeManager.verbose)
                            logToConsole('Re-initializing events');

                        detachEvents();
                        attachEvents();
                    }
                });
            };

            var observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
            initialized = true;
            this.bladesNavigator = enableBladesNavigator == undefined ? this.bladesNavigator : enableBladesNavigator;
            this.horizontalScrolling = enableHorizontalScrolling == undefined ? this.horizontalScrolling : enableHorizontalScrolling;
            this.scrollToBlades = enableScrollToBlades == undefined ? this.scrollToBlades : enableScrollToBlades;
            this.smoothScrolling = enableSmoothScrolling == undefined ? this.smoothScrolling : enableSmoothScrolling;

            window.setTimeout(function () {
                openUrlBlades();
            }, 300);
        }
    };

})();