// ==UserScript==
// @name         Readability Reader View
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Toggle reader view on any webpage with keyboard shortcut (Ctrl+Shift+R) or floating button
// @author       tbarthen
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/tbarthen/readability/master/readability-userscript.user.js
// @downloadURL  https://raw.githubusercontent.com/tbarthen/readability/master/readability-userscript.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Only run in top-level window, not iframes or dialogs
    if (window !== window.top) return;

    let readerActive = false;
    let originalHTML = null;
    let originalTitle = null;
    let floatingButton = null;
    let imageToggleButton = null;
    let imagesVisible = true;
    let imageHideStyle = null;
    let controlsTimeout = null;
    let isDragging = false;
    let dragStartX, dragStartY, btnStartX, btnStartY;
    const DRAG_THRESHOLD = 5;
    const STORAGE_KEY = 'readability-btn-pos';

    function getSavedPosition() {
        try {
            var pos = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (pos && typeof pos.right === 'number' && typeof pos.bottom === 'number') return pos;
        } catch(e) {}
        return { right: 20, bottom: 20 };
    }

    function savePosition(right, bottom) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ right: right, bottom: bottom })); } catch(e) {}
    }

    function clampPosition(right, bottom) {
        var maxRight = window.innerWidth - 50;
        var maxBottom = window.innerHeight - 50;
        return {
            right: Math.max(0, Math.min(right, maxRight)),
            bottom: Math.max(0, Math.min(bottom, maxBottom))
        };
    }

    function applyPosition(pos) {
        var clamped = clampPosition(pos.right, pos.bottom);
        if (floatingButton) {
            floatingButton.style.right = clamped.right + 'px';
            floatingButton.style.bottom = clamped.bottom + 'px';
        }
        if (imageToggleButton) {
            imageToggleButton.style.right = clamped.right + 'px';
            imageToggleButton.style.bottom = (clamped.bottom + 60) + 'px';
        }
    }

    function onDragStart(e) {
        var touch = e.touches ? e.touches[0] : e;
        isDragging = false;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
        var pos = getSavedPosition();
        btnStartX = pos.right;
        btnStartY = pos.bottom;
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
    }

    function onDragMove(e) {
        var touch = e.touches ? e.touches[0] : e;
        var dx = touch.clientX - dragStartX;
        var dy = touch.clientY - dragStartY;
        if (!isDragging && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        if (!isDragging) {
            isDragging = true;
            if (floatingButton) floatingButton.style.transition = 'none';
            if (imageToggleButton) imageToggleButton.style.transition = 'none';
        }
        if (e.cancelable) e.preventDefault();
        var newRight = btnStartX - dx;
        var newBottom = btnStartY + dy;
        applyPosition({ right: newRight, bottom: newBottom });
    }

    function onDragEnd() {
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        if (floatingButton) floatingButton.style.transition = 'all 0.3s ease';
        if (imageToggleButton) imageToggleButton.style.transition = 'all 0.3s ease';
        if (isDragging && floatingButton) {
            savePosition(
                parseInt(floatingButton.style.right) || 20,
                parseInt(floatingButton.style.bottom) || 20
            );
        }
    }

    function attachDrag(el) {
        el.addEventListener('mousedown', onDragStart);
        el.addEventListener('touchstart', onDragStart, { passive: true });
    }

    // Create floating button
    function createFloatingButton() {
        floatingButton = document.createElement('div');
        floatingButton.id = 'readability-toggle-btn';
        floatingButton.innerHTML = '📖';
        floatingButton.title = 'Toggle Reader View (Ctrl+Shift+R)';

        // Style the button
        var pos = getSavedPosition();
        var clamped = clampPosition(pos.right, pos.bottom);
        Object.assign(floatingButton.style, {
            position: 'fixed',
            bottom: clamped.bottom + 'px',
            right: clamped.right + 'px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#f06040',
            color: 'white',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '999999',
            transition: 'all 0.3s ease',
            userSelect: 'none',
            fontFamily: 'Arial, sans-serif'
        });

        // Hover effects
        floatingButton.addEventListener('mouseenter', function() {
            floatingButton.style.transform = 'scale(1.1)';
            floatingButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        });

        floatingButton.addEventListener('mouseleave', function() {
            floatingButton.style.transform = 'scale(1)';
            floatingButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });

        // Click handler (suppressed during drag)
        floatingButton.addEventListener('click', function(e) {
            if (isDragging) { isDragging = false; return; }
            toggleReaderView();
        });

        attachDrag(floatingButton);
        document.body.appendChild(floatingButton);
    }

    // Create image toggle button (appears above close button in reader mode)
    function createImageToggleButton() {
        imageToggleButton = document.createElement('div');
        imageToggleButton.id = 'readability-image-toggle-btn';
        imageToggleButton.innerHTML = '🖼️';
        imageToggleButton.title = 'Hide Images';

        var pos = getSavedPosition();
        var clamped = clampPosition(pos.right, pos.bottom);
        Object.assign(imageToggleButton.style, {
            position: 'fixed',
            bottom: (clamped.bottom + 60) + 'px',
            right: clamped.right + 'px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: '#f06040',
            color: 'white',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '999999',
            transition: 'all 0.3s ease',
            userSelect: 'none',
            fontFamily: 'Arial, sans-serif'
        });

        imageToggleButton.addEventListener('mouseenter', function() {
            imageToggleButton.style.transform = 'scale(1.1)';
            imageToggleButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
        });

        imageToggleButton.addEventListener('mouseleave', function() {
            imageToggleButton.style.transform = 'scale(1)';
            imageToggleButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });

        imageToggleButton.addEventListener('click', function(e) {
            if (isDragging) { isDragging = false; return; }
            toggleImages();
        });

        attachDrag(imageToggleButton);
        document.body.appendChild(imageToggleButton);
    }

    // Toggle image visibility
    function toggleImages() {
        imagesVisible = !imagesVisible;
        if (imagesVisible) {
            if (imageHideStyle) {
                imageHideStyle.remove();
                imageHideStyle = null;
            }
            imageToggleButton.style.opacity = '1';
            imageToggleButton.title = 'Hide Images';
        } else {
            imageHideStyle = document.createElement('style');
            imageHideStyle.textContent = 'img, picture, figure { display: none !important; }';
            document.head.appendChild(imageHideStyle);
            imageToggleButton.style.opacity = '0.5';
            imageToggleButton.title = 'Show Images';
        }
    }

    // Auto-hide controls after inactivity
    function showControls() {
        if (floatingButton) floatingButton.style.opacity = '1';
        if (imageToggleButton) {
            imageToggleButton.style.opacity = imagesVisible ? '1' : '0.5';
        }
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(hideControls, 3000);
    }

    function hideControls() {
        if (floatingButton) floatingButton.style.opacity = '0.15';
        if (imageToggleButton) imageToggleButton.style.opacity = '0.15';
    }

    function onUserActivity() {
        if (readerActive) showControls();
    }

    // Update button appearance based on reader state
    function updateButtonState() {
        if (floatingButton) {
            if (readerActive) {
                floatingButton.innerHTML = '✕';
                floatingButton.title = 'Exit Reader View (Ctrl+Shift+R)';
                floatingButton.style.backgroundColor = '#666';
            } else {
                floatingButton.innerHTML = '📖';
                floatingButton.title = 'Toggle Reader View (Ctrl+Shift+R)';
                floatingButton.style.backgroundColor = '#f06040';
            }
        }
    }

    // Activate reader view
    function activateReaderView() {
        // Save original state
        originalHTML = document.documentElement.innerHTML;
        originalTitle = document.title;

        // Load Readability library and apply
        var jsCode = document.createElement("script");
        jsCode.setAttribute(
            "src",
            "https://cdn.jsdelivr.net/gh/tbarthen/readability@1.0.8/Readability.min.js"
        );

        window.cleanHtml = function() {
            var loc = document.location;
            var uri = {
                spec: loc.href,
                host: loc.host,
                prePath: loc.protocol + "//" + loc.host,
                scheme: loc.protocol.substr(0, loc.protocol.indexOf(":")),
                pathBase: loc.protocol + "//" + loc.host + loc.pathname.substr(0, loc.pathname.lastIndexOf("/") + 1)
            };

            try {
                var article = new Readability(uri, document).parse();

                if (article && article.content) {
                    document.children[0].innerHTML = article.content;

                    // Ensure proper viewport for fixed positioning
                    var viewport = document.createElement('meta');
                    viewport.name = 'viewport';
                    viewport.content = 'width=device-width, initial-scale=1';
                    document.head.appendChild(viewport);

                    // Inject button positioning overrides
                    var btnStyle = document.createElement('style');
                    btnStyle.textContent = '#readability-toggle-btn, #readability-image-toggle-btn { position: fixed !important; z-index: 999999 !important; }';
                    document.head.appendChild(btnStyle);

                    // Remove leading <hr> elements
                    var leadingHr = document.querySelector('article > hr:first-child, .page > hr:first-child');
                    if (leadingHr) leadingHr.remove();

                    // Add title
                    var articleTitle = document.createElement("h1");
                    articleTitle.classList.add("articleTitle");
                    articleTitle.appendChild(document.createTextNode(article.title));
                    document.querySelector("body").prepend(articleTitle);

                    // Load CSS
                    var cleanStyle = document.createElement("link");
                    cleanStyle.setAttribute(
                        "href",
                        "https://cdn.jsdelivr.net/gh/tbarthen/readability@1.0.8/css/clean.css"
                    );
                    cleanStyle.setAttribute("rel", "stylesheet");
                    document.head.appendChild(cleanStyle);

                    // Setup collapsible captions
                    setTimeout(function() {
                        var captions = document.querySelectorAll(".caption");
                        captions.forEach(function(caption) {
                            var originalText = caption.textContent;
                            if (originalText.trim().length > 0) {
                                caption.innerHTML = "";
                                var toggle = document.createElement("span");
                                toggle.classList.add("caption-toggle");
                                toggle.textContent = "[+]";
                                var content = document.createElement("span");
                                content.classList.add("caption-content");
                                content.textContent = originalText;
                                toggle.addEventListener("click", function() {
                                    if (content.classList.contains("expanded")) {
                                        content.classList.remove("expanded");
                                        toggle.textContent = "[+]";
                                    } else {
                                        content.classList.add("expanded");
                                        toggle.textContent = "[\u2212]";
                                    }
                                });
                                caption.appendChild(toggle);
                                caption.appendChild(content);
                            }
                        });

                        // Re-add the floating buttons
                        createFloatingButton();
                        createImageToggleButton();
                        readerActive = true;
                        updateButtonState();
                        showControls();

                        // Show controls on any user interaction
                        document.addEventListener('touchstart', onUserActivity);
                        document.addEventListener('click', onUserActivity);
                        document.addEventListener('scroll', onUserActivity);
                    }, 100);
                } else {
                    alert('Could not parse this page for reader view. The page may not have article content.');
                    restoreOriginalView();
                }
            } catch (e) {
                console.error('Readability error:', e);
                alert('Error parsing page: ' + e.message);
                restoreOriginalView();
            }
        };

        jsCode.onload = cleanHtml;
        document.body.appendChild(jsCode);
    }

    // Restore original view
    function restoreOriginalView() {
        if (originalHTML) {
            document.documentElement.innerHTML = originalHTML;
            document.title = originalTitle;
            originalHTML = null;
            originalTitle = null;
        }
        readerActive = false;
        imagesVisible = true;
        imageToggleButton = null;
        if (imageHideStyle) {
            imageHideStyle = null;
        }
        clearTimeout(controlsTimeout);
        document.removeEventListener('touchstart', onUserActivity);
        document.removeEventListener('click', onUserActivity);
        document.removeEventListener('scroll', onUserActivity);

        // Re-initialize everything
        setTimeout(function() {
            createFloatingButton();
            updateButtonState();
            attachKeyboardShortcut();
        }, 100);
    }

    // Toggle between reader and normal view
    function toggleReaderView() {
        if (readerActive) {
            restoreOriginalView();
        } else {
            activateReaderView();
        }
    }

    // Keyboard shortcut handler
    function attachKeyboardShortcut() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+Shift+R (or Cmd+Shift+R on Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                toggleReaderView();
            }
        });
    }

    // Initialize
    function init() {
        // Wait for page to be ready
        if (document.body) {
            createFloatingButton();
            attachKeyboardShortcut();
        } else {
            setTimeout(init, 100);
        }
    }

    // Start the script
    init();
})();
