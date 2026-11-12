<?php
/**
 * PhentiBuild - Public Site Navigation
 *
 * Shared sticky nav + mobile menu for every public marketing page
 * (home.php, features.php, how-it-works.php, vision.php, contact.php).
 * Each page sets $homeActivePage before including this (one of 'home',
 * 'features', 'how-it-works', 'vision', 'contact') so the matching nav
 * link gets an active state — defaults to 'home' so a page that forgets
 * to set it still renders correctly rather than fatally erroring on an
 * undefined var.
 *
 * Requires backend/components/home-icons.php ($homeIcons, home_icon())
 * and backend/components/logo.php (phb_logo_mark()) to already be
 * loaded by the including page.
 */
$homeActivePage = $homeActivePage ?? 'home';

$homeNavLinks = [
    'home' => ['href' => 'home.php', 'label' => 'Home'],
    'features' => ['href' => 'features.php', 'label' => 'Features'],
    'how-it-works' => ['href' => 'how-it-works.php', 'label' => 'How It Works'],
    'vision' => ['href' => 'vision.php', 'label' => 'Vision'],
    'contact' => ['href' => 'contact.php', 'label' => 'Contact'],
];

function home_nav_link_class($key, $active, $extra = '') {
    $classes = trim($extra . ($key === $active ? ' is-active' : ''));
    return $classes !== '' ? ' class="' . htmlspecialchars($classes) . '"' : '';
}
?>
<header class="home-nav" data-home-nav>
    <div class="home-container home-nav-inner">
        <a href="home.php" class="home-nav-brand">
            <?php echo phb_logo_mark('', 36); ?>
            Phenti<span class="accent">Build</span>
        </a>

        <nav class="home-nav-links" aria-label="Primary">
            <?php foreach ($homeNavLinks as $key => $link): ?>
                <a href="<?php echo htmlspecialchars($link['href']); ?>"<?php echo home_nav_link_class($key, $homeActivePage); ?><?php echo $key === $homeActivePage ? ' aria-current="page"' : ''; ?>><?php echo htmlspecialchars($link['label']); ?></a>
            <?php endforeach; ?>
        </nav>

        <div class="home-nav-actions">
            <a href="login.php" class="btn btn-ghost home-nav-signin">Sign In</a>
            <a href="register.php" class="btn btn-primary">Get Started</a>
        </div>

        <button type="button" class="home-nav-toggle" data-home-menu-toggle aria-expanded="false" aria-controls="homeMobileMenu" aria-label="Open menu">
            <?php echo home_icon($homeIcons, 'menu', 'icon-menu'); ?>
            <?php echo home_icon($homeIcons, 'close', 'icon-close'); ?>
        </button>
    </div>

    <nav class="home-mobile-menu" id="homeMobileMenu" data-home-mobile-menu aria-label="Mobile">
        <?php foreach ($homeNavLinks as $key => $link): ?>
            <a href="<?php echo htmlspecialchars($link['href']); ?>"<?php echo home_nav_link_class($key, $homeActivePage); ?><?php echo $key === $homeActivePage ? ' aria-current="page"' : ''; ?>><?php echo htmlspecialchars($link['label']); ?></a>
        <?php endforeach; ?>
        <div class="home-mobile-menu-actions">
            <a href="login.php" class="btn btn-outline-secondary btn-block">Sign In</a>
            <a href="register.php" class="btn btn-primary btn-block">Get Started</a>
        </div>
    </nav>
</header>
