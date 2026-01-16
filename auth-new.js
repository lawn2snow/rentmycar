/**
 * RentMyCar - Authentication System
 * Production-ready authentication with proper security
 */

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupAuthListeners();
});

// Check if user is logged in
function checkAuthStatus() {
    const user = api.getStoredUser();

    if (api.isLoggedIn() && user) {
        showUserMenu(user);
    } else {
        showAuthButton();
    }
}

// Show user menu when logged in
function showUserMenu(user) {
    const authBtn = document.getElementById('authBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (authBtn) authBtn.style.display = 'none';
    if (userMenu) {
        userMenu.style.display = 'flex';
        if (userName) {
            // Safely set text content to prevent XSS
            const displayName = user.firstName || (user.email ? user.email.split('@')[0] : 'User');
            userName.textContent = displayName;
        }
    }
}

// Show auth button when logged out
function showAuthButton() {
    const authBtn = document.getElementById('authBtn');
    const userMenu = document.getElementById('userMenu');

    if (authBtn) authBtn.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
}

// Open authentication modal
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
        switchToSignIn();
        // Focus on first input for accessibility
        setTimeout(() => {
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    }
}

// Close authentication modal
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Switch to Sign Up form
function switchToSignUp() {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');

    if (signInForm) signInForm.style.display = 'none';
    if (signUpForm) signUpForm.style.display = 'block';
    if (authTitle) authTitle.textContent = 'Create Account';
    if (authSubtitle) authSubtitle.textContent = 'Join RentMyCar today';
}

// Switch to Sign In form
function switchToSignIn() {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');

    if (signInForm) signInForm.style.display = 'block';
    if (signUpForm) signUpForm.style.display = 'none';
    if (authTitle) authTitle.textContent = 'Welcome Back!';
    if (authSubtitle) authSubtitle.textContent = 'Sign in to access your account';
}

// Setup authentication event listeners
function setupAuthListeners() {
    // Sign In Form
    const signInForm = document.getElementById('signInForm');
    if (signInForm) {
        signInForm.addEventListener('submit', handleSignIn);
    }

    // Sign Up Form
    const signUpForm = document.getElementById('signUpForm');
    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUp);
    }

    // Password strength indicator
    const signUpPassword = document.getElementById('signUpPassword');
    if (signUpPassword) {
        signUpPassword.addEventListener('input', checkPasswordStrength);
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('authModal');
        if (event.target === modal) {
            closeAuthModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAuthModal();
        }
    });

    // User menu dropdown
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = userBtn.nextElementSibling;
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        const dropdowns = document.querySelectorAll('.dropdown-menu');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });
}

// Handle Sign In
async function handleSignIn(e) {
    e.preventDefault();

    const emailInput = document.getElementById('signInEmail');
    const passwordInput = document.getElementById('signInPassword');
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    // Sanitize and validate email
    const email = SecurityUtils.sanitizeEmail(emailInput.value);
    const password = passwordInput.value;

    if (!email) {
        showToast('Please enter a valid email address', 'error');
        emailInput.focus();
        return;
    }

    if (!password) {
        showToast('Please enter your password', 'error');
        passwordInput.focus();
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    submitBtn.disabled = true;

    try {
        const result = await api.login(email, password, rememberMe);

        if (result.success && result.sessionToken) {
            showUserMenu(result.user);
            closeAuthModal();
            showToast('Welcome back!', 'success');

            // Redirect based on role
            setTimeout(() => {
                redirectToDashboard(result.user);
            }, 1000);
        } else {
            showToast(result.error || 'Invalid email or password', 'error');
        }
    } catch (error) {
        if (!CONFIG.IS_PRODUCTION) {
            console.error('Login error:', error);
        }
        showToast('Unable to connect. Please try again later.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Handle Sign Up
async function handleSignUp(e) {
    e.preventDefault();

    // Get form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const emailInput = document.getElementById('signUpEmail');
    const passwordInput = document.getElementById('signUpPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const phone = SecurityUtils.sanitizePhone(document.getElementById('signUpPhone')?.value || '');
    const role = document.getElementById('signUpRole')?.value || 'renter';
    const businessName = document.getElementById('signUpBusinessName')?.value?.trim() || '';
    const agreeTerms = document.getElementById('agreeTerms').checked;

    // Sanitize email
    const email = SecurityUtils.sanitizeEmail(emailInput.value);
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate required fields
    if (!firstName || !lastName) {
        showToast('Please enter your first and last name', 'error');
        return;
    }

    if (!email) {
        showToast('Please enter a valid email address', 'error');
        emailInput.focus();
        return;
    }

    // Validate password strength
    const passwordValidation = SecurityUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
        showToast(passwordValidation.errors[0], 'error');
        passwordInput.focus();
        return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        confirmPasswordInput.focus();
        return;
    }

    // Validate terms agreement
    if (!agreeTerms) {
        showToast('Please agree to the terms and conditions', 'error');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;

    try {
        const result = await api.signup({
            firstName: SecurityUtils.sanitizeInput(firstName),
            lastName: SecurityUtils.sanitizeInput(lastName),
            email,
            password,
            phone,
            role,
            businessName: SecurityUtils.sanitizeInput(businessName)
        });

        if (result.success && result.sessionToken) {
            showUserMenu(result.user);
            closeAuthModal();
            showToast('Account created successfully! Welcome to RentMyCar!', 'success');

            // Redirect based on role
            setTimeout(() => {
                redirectToDashboard(result.user);
            }, 1500);
        } else {
            showToast(result.error || 'Unable to create account. Please try again.', 'error');
        }
    } catch (error) {
        if (!CONFIG.IS_PRODUCTION) {
            console.error('Signup error:', error);
        }
        showToast('Unable to connect. Please try again later.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Redirect to appropriate dashboard based on role
function redirectToDashboard(user) {
    if (user.role === 'owner' || user.role === 'both') {
        window.location.href = 'dashboard.html';
    } else {
        window.location.href = 'renter-dashboard.html';
    }
}

// Logout function
async function logout() {
    if (confirm('Are you sure you want to log out?')) {
        showToast('Logging out...', 'info');

        try {
            await api.logout();
        } catch (error) {
            // Continue with logout even if API call fails
        }

        showAuthButton();
        showToast('Logged out successfully', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Check password strength
function checkPasswordStrength(e) {
    const password = e.target.value;
    const strengthBar = document.querySelector('.strength-bar');

    if (!strengthBar) return;

    // Use SecurityUtils for consistent strength calculation
    const strength = SecurityUtils.calculatePasswordStrength(password);
    strengthBar.style.width = strength + '%';

    if (strength <= 25) {
        strengthBar.style.backgroundColor = '#ef4444';
    } else if (strength <= 50) {
        strengthBar.style.backgroundColor = '#f59e0b';
    } else if (strength <= 75) {
        strengthBar.style.backgroundColor = '#10b981';
    } else {
        strengthBar.style.backgroundColor = '#059669';
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return api.isLoggedIn();
}

// Get current user
function getCurrentUser() {
    return api.getStoredUser();
}

// Protected action wrapper
function requireAuth(callback) {
    if (isAuthenticated()) {
        callback();
    } else {
        showToast('Please sign in to continue', 'warning');
        openAuthModal();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const iconMap = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const icon = document.createElement('i');
    icon.className = `fas fa-${iconMap[type] || 'info-circle'}`;

    const span = document.createElement('span');
    span.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(span);
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Social auth placeholder
function socialAuth(provider) {
    showToast(`${provider} authentication coming soon`, 'info');
}

// Export functions for use in other scripts
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.requireAuth = requireAuth;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchToSignIn = switchToSignIn;
window.switchToSignUp = switchToSignUp;
window.logout = logout;
window.showToast = showToast;
window.redirectToDashboard = redirectToDashboard;
window.socialAuth = socialAuth;
