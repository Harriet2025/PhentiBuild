/**
 * PhentiBuild (PhB) - Toast
 * Small shared helper for transient confirmations and "not built yet"
 * notices. One toast at a time; the previous one is replaced.
 */
(function () {
    'use strict';

    var timer = null;

    function toast(message, variant) {
        var existing = document.querySelector('.phb-toast');
        if (existing) { existing.remove(); }

        var el = document.createElement('div');
        el.className = 'phb-toast' + (variant ? ' phb-toast-' + variant : '');
        el.setAttribute('role', 'status');
        el.textContent = message;
        document.body.appendChild(el);

        clearTimeout(timer);
        timer = setTimeout(function () { el.remove(); }, 3200);
    }

    window.PhB = window.PhB || {};
    window.PhB.toast = toast;
})();
