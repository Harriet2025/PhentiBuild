<?php
/**
 * PhentiBuild - Logo
 *
 * Outputs the official PhB logo artwork. phb-logo.png is the supplied
 * artwork trimmed to the mark itself (the original JPEG padded it with
 * roughly half a frame of empty ground, which made it look tiny at UI
 * sizes) with that ground keyed out to transparency so it sits on any
 * surface. phb-logo.jpeg is kept as the untouched original.
 *
 * Usage: echo phb_logo_mark('brand-logo', 48);
 */
function phb_logo_mark($class = '', $size = 48) {
    return '<img src="/PhentiBuild/frontend/assets/images/phb-logo.png"'
         . ' alt="PhentiBuild"'
         . ' class="' . htmlspecialchars($class) . '"'
         . ' width="' . (int) $size . '" height="' . (int) $size . '">';
}
