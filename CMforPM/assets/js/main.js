// Campus Compass - Main JavaScript
// Load database first
const script = document.createElement('script');
script.src = 'assets/js/database.js';
script.onload = function() {
  initApp();
};
document.head.appendChild(script);

function initApp() {
  // Simple client-side filtering for featured item cards
  (function () {
    const form = document.getElementById('listing-filters');
    const kw = document.getElementById('kw');
    const cat = document.getElementById('cat');
    const loc = document.getElementById('loc');
    const cards = Array.from(document.querySelectorAll('.item-card'));

    function normalize(value) {
      return (value || '').toString().trim().toLowerCase();
    }

    function applyFilters() {
      const q = normalize(kw && kw.value);
      const c = normalize(cat && cat.value);
      const l = normalize(loc && loc.value);

      cards.forEach((card) => {
        const title = normalize(card.getAttribute('data-title'));
        const category = normalize(card.getAttribute('data-category'));
        const location = normalize(card.getAttribute('data-location'));

        const matchesKw = !q || title.includes(q);
        const matchesCat = !c || category === c;
        const matchesLoc = !l || location === l;

        const show = matchesKw && matchesCat && matchesLoc;
        card.style.display = show ? '' : 'none';
      });
    }

    if (form) {
      form.addEventListener('input', applyFilters);
      form.addEventListener('reset', () => {
        setTimeout(applyFilters, 0);
      });
    }

    applyFilters();
  })();

  // Auth utilities with database integration
  (function () {
    function onReady(fn) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn, { once: true });
      } else {
        fn();
      }
    }

    function getAuth() {
      const authData = localStorage.getItem('cc_current_user');
      if (!authData) return { isAuthed: false, role: null, user: null };
      try {
        const user = JSON.parse(authData);
        return { isAuthed: true, role: user.role, user: user };
      } catch {
        return { isAuthed: false, role: null, user: null };
      }
    }

    function setAuth(user) {
      localStorage.setItem('cc_current_user', JSON.stringify(user));
      localStorage.setItem('cc_auth', 'true');
      localStorage.setItem('cc_role', user.role);
    }

    function clearAuth() {
      localStorage.removeItem('cc_current_user');
      localStorage.removeItem('cc_auth');
      localStorage.removeItem('cc_role');
    }

    function bindPasswordToggle(container) {
      const input = container.querySelector('input[type="password"]');
      const toggle = container.querySelector('.pw-toggle');
      if (!input || !toggle) return;
      toggle.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        toggle.textContent = isHidden ? 'Hide' : 'Show';
      });
    }

    onReady(() => {
      document.querySelectorAll('.password-field').forEach(bindPasswordToggle);
    });

    // Login form handler (index.html)
    onReady(() => {
      const loginForm = document.getElementById('login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('login-email')?.value.trim();
          const password = document.getElementById('login-password')?.value;
          const role = document.getElementById('login-role')?.value;

          if (!email || !password) {
            alert('Please enter email and password');
            return;
          }

          const user = DB.getUserByEmail(email);
          if (!user || user.password !== password) {
            alert('Invalid email or password');
            return;
          }

          if (user.role !== role) {
            alert(`This account is registered as ${user.role}, not ${role}`);
            return;
          }

          setAuth(user);
          
          if (user.role === 'admin' || user.role === 'management') {
            window.location.href = 'dashboard.html';
          } else {
            window.location.href = 'dashboard.html';
          }
        });
      }
    });

    // Homepage login form handler
    onReady(() => {
      const homeLoginForm = document.getElementById('home-login-form');
      if (homeLoginForm) {
        homeLoginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const loginId = document.getElementById('home-login-id')?.value.trim();
          const password = document.getElementById('home-login-password')?.value;

          if (!loginId || !password) {
            alert('Please enter login ID and password');
            return;
          }

          const user = DB.getUserByEmail(loginId);
          if (!user || user.password !== password) {
            alert('Invalid login ID or password');
            return;
          }

          setAuth(user);
          window.location.href = 'dashboard.html';
        });
      }
    });

    // Signup form handler
    onReady(() => {
      const signupForm = document.getElementById('signup-form');
      if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const terms = document.getElementById('su-terms');
          if (terms && !terms.checked) {
            alert('Please accept the terms to continue.');
            return;
          }

          const email = document.getElementById('su-email')?.value.trim();
          const password = document.getElementById('su-password')?.value;
          const name = document.getElementById('su-name')?.value.trim();
          const role = document.getElementById('su-role')?.value;

          if (!email || !password || !name) {
            alert('Please fill all required fields');
            return;
          }

          if (DB.getUserByEmail(email)) {
            alert('An account with this email already exists');
            return;
          }

          const newUser = DB.addUser({ email, password, name, role });
          setAuth(newUser);
          alert('Account created successfully!');
          window.location.href = 'dashboard.html';
        });
      }
    });

    // Homepage register form handler
    onReady(() => {
      const homeRegisterForm = document.getElementById('home-register-form');
      if (homeRegisterForm) {
        homeRegisterForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const regId = document.getElementById('reg-id')?.value.trim();
          const dob = document.getElementById('reg-dob')?.value;
          const role = document.getElementById('reg-role')?.value;

          if (!regId || !dob || !role) {
            alert('Please fill all required fields');
            return;
          }

          if (DB.getUserByEmail(regId)) {
            alert('An account with this ID already exists');
            return;
          }

          const newUser = DB.addUser({ 
            email: regId, 
            password: 'default123', // In production, require password setup
            name: regId.split('@')[0],
            role 
          });
          setAuth(newUser);
          alert('Registration successful! Default password is "default123". Please change it after login.');
          window.location.href = 'dashboard.html';
        });
      }
    });

    // Header state management
    onReady(() => {
      const actions = document.querySelector('.auth-actions');
      if (!actions) return;
      const { isAuthed, role, user } = getAuth();
      if (isAuthed && user) {
        actions.innerHTML = `<span class="user-pill">Signed in as ${user.name} (${role})</span> <button id="cc-signout" class="btn btn-sm btn-outline">Sign out</button>`;
        const signout = document.getElementById('cc-signout');
        if (signout) {
          signout.addEventListener('click', () => {
            clearAuth();
            window.location.href = 'index.html';
          });
        }
      }
      
      // Brand link should go to the right page
      const brand = document.querySelector('.brand');
      if (brand && brand instanceof HTMLAnchorElement) {
        brand.href = isAuthed ? 'dashboard.html' : 'home.html';
      }
    });

    // Redirect away from login page if already authenticated
    onReady(() => {
      const onLoginPage = !!document.getElementById('login-form') || !!document.getElementById('home-login-form');
      if (!onLoginPage) return;
      const { isAuthed } = getAuth();
      if (isAuthed) {
        window.location.replace('dashboard.html');
      }
    });

    // Redirect away from signup if already authenticated
    onReady(() => {
      const onSignupPage = !!document.getElementById('signup-form') || !!document.getElementById('home-register-form');
      if (!onSignupPage) return;
      const { isAuthed } = getAuth();
      if (isAuthed) {
        window.location.replace('dashboard.html');
      }
    });

    // Route guards: protect dashboard
    onReady(() => {
      const path = (location.pathname.split('/').pop() || '').toLowerCase();
      if (path === 'dashboard.html' || path === 'admin.html') {
        const { isAuthed } = getAuth();
        if (!isAuthed) {
          window.location.replace('index.html');
        }
      }
    });
  })();
}
