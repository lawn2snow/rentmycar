/**
 * RentMyCar - Mobile Experience
 * Uber-like app functionality for mobile devices
 * Page-aware: works on main site and dashboards independently
 */

(function() {
    'use strict';

    // Detect which page we're on
    const isMainSite = document.getElementById('hamburgerMenu') !== null;
    const isDashboard = document.querySelector('.dashboard-body') !== null;

    // Mobile Menu Functions (only for main site)
    window.toggleMobileMenu = function() {
        if (!isMainSite) return;

        const hamburger = document.getElementById('hamburgerMenu');
        const overlay = document.getElementById('mobileMenuOverlay');
        const slideMenu = document.getElementById('mobileSlideMenu');

        if (!hamburger || !overlay || !slideMenu) return;

        hamburger.classList.toggle('active');
        overlay.classList.toggle('show');
        slideMenu.classList.toggle('show');

        // Prevent body scroll when menu is open
        document.body.style.overflow = slideMenu.classList.contains('show') ? 'hidden' : '';
    };

    window.closeMobileMenu = function() {
        if (!isMainSite) return;

        const hamburger = document.getElementById('hamburgerMenu');
        const overlay = document.getElementById('mobileMenuOverlay');
        const slideMenu = document.getElementById('mobileSlideMenu');

        if (hamburger) hamburger.classList.remove('active');
        if (overlay) overlay.classList.remove('show');
        if (slideMenu) slideMenu.classList.remove('show');
        document.body.style.overflow = '';
    };

    // Dashboard sidebar toggle (for dashboard pages)
    window.toggleDashboardSidebar = function() {
        if (!isDashboard) return;

        const sidebar = document.querySelector('.dashboard-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar) {
            sidebar.classList.toggle('show');
        }
        if (overlay) {
            overlay.classList.toggle('show');
        }

        document.body.style.overflow = sidebar && sidebar.classList.contains('show') ? 'hidden' : '';
    };

    window.closeDashboardSidebar = function() {
        if (!isDashboard) return;

        const sidebar = document.querySelector('.dashboard-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
    };

    // Update mobile menu based on auth state (only for main site)
    function updateMobileMenuAuth() {
        if (!isMainSite) return;

        const user = (typeof api !== 'undefined' && api) ? api.getStoredUser() : null;
        const isLoggedIn = user !== null;

        // Mobile slide menu elements
        const mobileUserName = document.getElementById('mobileUserName');
        const mobileUserEmail = document.getElementById('mobileUserEmail');
        const mobileOwnerLink = document.getElementById('mobileOwnerLink');
        const mobileRenterLink = document.getElementById('mobileRenterLink');
        const mobileDivider2 = document.getElementById('mobileDivider2');
        const mobileSignInLink = document.getElementById('mobileSignInLink');
        const mobileLogoutLink = document.getElementById('mobileLogoutLink');
        const mobileProfileLink = document.getElementById('mobileProfileLink');

        if (isLoggedIn && user) {
            if (mobileUserName) mobileUserName.textContent = `${user.firstName} ${user.lastName}`;
            if (mobileUserEmail) mobileUserEmail.textContent = user.email;

            // Show appropriate dashboard link based on role
            if (mobileOwnerLink && (user.role === 'owner' || user.role === 'both')) {
                mobileOwnerLink.style.display = 'flex';
            }
            if (mobileRenterLink && (user.role === 'renter' || user.role === 'both')) {
                mobileRenterLink.style.display = 'flex';
            }
            if (mobileDivider2) mobileDivider2.style.display = 'block';
            if (mobileSignInLink) mobileSignInLink.style.display = 'none';
            if (mobileLogoutLink) mobileLogoutLink.style.display = 'flex';

            // Update bottom nav profile link
            if (mobileProfileLink) {
                if (user.role === 'owner' || user.role === 'both') {
                    mobileProfileLink.href = 'dashboard.html';
                } else {
                    mobileProfileLink.href = 'renter-dashboard.html';
                }
                mobileProfileLink.onclick = null;
            }
        } else {
            if (mobileUserName) mobileUserName.textContent = 'Guest';
            if (mobileUserEmail) mobileUserEmail.textContent = 'Sign in to continue';
            if (mobileOwnerLink) mobileOwnerLink.style.display = 'none';
            if (mobileRenterLink) mobileRenterLink.style.display = 'none';
            if (mobileDivider2) mobileDivider2.style.display = 'none';
            if (mobileSignInLink) mobileSignInLink.style.display = 'flex';
            if (mobileLogoutLink) mobileLogoutLink.style.display = 'none';
        }
    }

    // Pull to Refresh functionality (only for main site)
    let touchStartY = 0;
    let touchEndY = 0;
    let isPulling = false;

    function handleTouchStart(e) {
        if (!isMainSite) return;
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
        }
    }

    function handleTouchMove(e) {
        if (!isMainSite) return;
        const pullToRefresh = document.getElementById('pullToRefresh');

        if (window.scrollY === 0 && touchStartY > 0) {
            touchEndY = e.touches[0].clientY;
            const pullDistance = touchEndY - touchStartY;

            if (pullDistance > 0 && pullDistance < 150) {
                isPulling = true;
                if (pullToRefresh) {
                    pullToRefresh.style.transform = `translateX(-50%) translateY(${Math.min(pullDistance - 40, 60)}px)`;
                }
            }
        }
    }

    function handleTouchEnd() {
        if (!isMainSite) return;
        const pullToRefresh = document.getElementById('pullToRefresh');

        if (isPulling && touchEndY - touchStartY > 80) {
            // Trigger refresh
            if (pullToRefresh) {
                pullToRefresh.classList.add('refreshing');
                pullToRefresh.style.transform = 'translateX(-50%) translateY(20px)';
            }

            // Simulate refresh
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            // Reset
            if (pullToRefresh) {
                pullToRefresh.style.transform = 'translateX(-50%) translateY(-60px)';
            }
        }

        touchStartY = 0;
        touchEndY = 0;
        isPulling = false;
    }

    // Mobile navigation active state
    function updateMobileNavActive() {
        const currentPath = window.location.pathname;
        const hash = window.location.hash;
        const navItems = document.querySelectorAll('.mobile-nav-item');

        navItems.forEach(item => {
            item.classList.remove('active');
            const href = item.getAttribute('href');

            if (href === 'index.html' && (currentPath.endsWith('index.html') || currentPath === '/')) {
                item.classList.add('active');
            } else if (href === hash && hash) {
                item.classList.add('active');
            } else if (href && href.startsWith('#') && hash === href) {
                item.classList.add('active');
            }
        });

        // For dashboard pages, set first item as active by default if no hash
        if (isDashboard && !hash) {
            const firstNavItem = document.querySelector('.mobile-nav-item');
            if (firstNavItem) firstNavItem.classList.add('active');
        }
    }

    // Smooth scroll for hash links
    function handleHashLinks() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();

                    // Close appropriate menu
                    if (isMainSite) {
                        closeMobileMenu();
                    } else if (isDashboard) {
                        closeDashboardSidebar();
                    }

                    // Smooth scroll with offset for navbar
                    const navHeight = isDashboard ? 60 : 70;
                    const targetPosition = target.offsetTop - navHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL without jumping
                    history.pushState(null, null, targetId);
                    updateMobileNavActive();
                }
            });
        });
    }

    // Touch feedback for buttons
    function addTouchFeedback() {
        const buttons = document.querySelectorAll('.btn, .chip, .car-card, .mobile-nav-item, .nav-item, .stat-card');

        buttons.forEach(btn => {
            btn.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
            }, { passive: true });

            btn.addEventListener('touchend', function() {
                this.style.transform = '';
            }, { passive: true });
        });
    }

    // Swipe navigation for car cards (only for main site)
    function initSwipeCards() {
        if (!isMainSite) return;

        const carsGrid = document.getElementById('carsGrid');
        if (!carsGrid) return;

        if (window.innerWidth <= 768) {
            carsGrid.classList.add('swipe-container');
            carsGrid.style.display = 'flex';
            carsGrid.style.overflowX = 'auto';
            carsGrid.style.scrollSnapType = 'x mandatory';

            const cards = carsGrid.querySelectorAll('.car-card');
            cards.forEach(card => {
                card.style.flex = '0 0 85%';
                card.style.scrollSnapAlign = 'center';
            });
        }
    }

    // Haptic feedback (for devices that support it)
    function triggerHaptic(type = 'light') {
        if ('vibrate' in navigator) {
            switch(type) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(20);
                    break;
                case 'heavy':
                    navigator.vibrate(30);
                    break;
            }
        }
    }

    // Add haptic to interactive elements
    function addHapticFeedback() {
        document.querySelectorAll('.btn, .chip, .mobile-nav-item, .nav-item').forEach(el => {
            el.addEventListener('touchstart', () => triggerHaptic('light'), { passive: true });
        });
    }

    // Detect if running as PWA
    function isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // Initialize app install banner (only for main site)
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        if (!isMainSite) return;

        e.preventDefault();
        deferredPrompt = e;

        // Show install button in FAB
        const fab = document.getElementById('fabButton');
        if (fab && !isPWA()) {
            fab.innerHTML = '<i class="fas fa-download"></i>';
            fab.onclick = async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        // User accepted install prompt
                    }
                    deferredPrompt = null;
                    fab.innerHTML = '<i class="fas fa-plus"></i>';
                    fab.onclick = () => window.openAuthModal && window.openAuthModal();
                }
            };
        }
    });

    // Handle scroll events for bottom nav hide/show
    let lastScrollY = 0;
    let ticking = false;

    function handleScroll() {
        const mobileNav = document.querySelector('.mobile-nav');
        const fab = document.getElementById('fabButton');

        if (!mobileNav) return;

        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        // Hide on scroll down, show on scroll up
        if (scrollDelta > 10 && currentScrollY > 100) {
            mobileNav.style.transform = 'translateY(100%)';
            if (fab) fab.style.transform = 'translateY(100px)';
        } else if (scrollDelta < -10 || currentScrollY < 100) {
            mobileNav.style.transform = 'translateY(0)';
            if (fab) fab.style.transform = 'translateY(0)';
        }

        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // Add transition to mobile nav
    function setupMobileNavTransition() {
        const mobileNav = document.querySelector('.mobile-nav');
        const fab = document.getElementById('fabButton');

        if (mobileNav) {
            mobileNav.style.transition = 'transform 0.3s ease';
        }
        if (fab) {
            fab.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        }
    }

    // Setup dashboard sidebar toggle
    function setupDashboardSidebar() {
        if (!isDashboard) return;

        // Add click handler to menu toggle button
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', toggleDashboardSidebar);
        }

        // Create overlay if it doesn't exist
        if (!document.querySelector('.sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.onclick = closeDashboardSidebar;
            document.body.appendChild(overlay);
        }
    }

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Mobile.js initialized

        // Add touch events for pull to refresh (main site only)
        if (isMainSite) {
            document.addEventListener('touchstart', handleTouchStart, { passive: true });
            document.addEventListener('touchmove', handleTouchMove, { passive: true });
            document.addEventListener('touchend', handleTouchEnd, { passive: true });
        }

        // Initialize features for all pages
        handleHashLinks();
        addTouchFeedback();
        addHapticFeedback();
        setupMobileNavTransition();
        updateMobileNavActive();

        // Main site specific
        if (isMainSite) {
            setTimeout(initSwipeCards, 1000);
            setTimeout(updateMobileMenuAuth, 100);
        }

        // Dashboard specific
        if (isDashboard) {
            setupDashboardSidebar();
        }

        // Close menus on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (isMainSite) closeMobileMenu();
                if (isDashboard) closeDashboardSidebar();
            }
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            if (isMainSite) {
                closeMobileMenu();
                setTimeout(initSwipeCards, 500);
            }
            if (isDashboard) {
                closeDashboardSidebar();
            }
        });

        // Add page transition class
        document.body.classList.add('page-transition');
    });

    // Re-run auth check when auth state changes (main site only)
    if (isMainSite) {
        window.addEventListener('authStateChanged', updateMobileMenuAuth);
    }

})();
