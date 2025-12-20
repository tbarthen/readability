// ==UserScript==
// @name         Readability Reader View
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Toggle reader view on any webpage with keyboard shortcut (Ctrl+Shift+R) or floating button
// @author       tbarthen
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let readerActive = false;
    let originalHTML = null;
    let originalTitle = null;
    let floatingButton = null;

    // Create floating button
    function createFloatingButton() {
        floatingButton = document.createElement('div');
        floatingButton.id = 'readability-toggle-btn';
        floatingButton.innerHTML = '📖';
        floatingButton.title = 'Toggle Reader View (Ctrl+Shift+R)';

        // Style the button
        Object.assign(floatingButton.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
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

        // Click handler
        floatingButton.addEventListener('click', toggleReaderView);

        document.body.appendChild(floatingButton);
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
            "https://cdn.jsdelivr.net/gh/tbarthen/readability@1.0.1/Readability.min.js"
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

                    // Add title
                    var articleTitle = document.createElement("h1");
                    articleTitle.classList.add("articleTitle");
                    articleTitle.appendChild(document.createTextNode(article.title));
                    document.querySelector("body").prepend(articleTitle);

                    // Load CSS
                    var cleanStyle = document.createElement("link");
                    cleanStyle.setAttribute(
                        "href",
                        "https://cdn.jsdelivr.net/gh/tbarthen/readability@1.0.1/css/clean.css"
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

                        // Re-add the floating button
                        createFloatingButton();
                        readerActive = true;
                        updateButtonState();
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
