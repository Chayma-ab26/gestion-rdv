// Gestion des tokens
const setToken = (token) => {
    localStorage.setItem('token', token);
};

const getToken = () => {
    return localStorage.getItem('token');
};

const removeToken = () => {
    localStorage.removeItem('token');
};

// Gestion de l'utilisateur
const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    updateNavigation(user);
};

const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

const removeUser = () => {
    localStorage.removeItem('user');
};

// Mise à jour de la navigation
const updateNavigation = (user) => {
    const loginNav = document.getElementById('loginNav');
    const registerNav = document.getElementById('registerNav');
    const dashboardNav = document.getElementById('dashboardNav');
    const logoutNav = document.getElementById('logoutNav');

    if (user) {
        loginNav?.classList.add('d-none');
        registerNav?.classList.add('d-none');
        dashboardNav?.classList.remove('d-none');
        logoutNav?.classList.remove('d-none');
    } else {
        loginNav?.classList.remove('d-none');
        registerNav?.classList.remove('d-none');
        dashboardNav?.classList.add('d-none');
        logoutNav?.classList.add('d-none');
    }
};

// Fonction de connexion
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            setToken(data.token);
            setUser(data.user);
            window.location.href = '/dashboard.html';
        } else {
            alert(data.message || 'Erreur de connexion');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion');
    }
}

// Fonction d'inscription
async function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
            const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            registerModal.hide();
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        } else {
            alert(data.message || 'Erreur lors de l\'inscription');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'inscription');
    }
}

// Fonction de déconnexion
function logout() {
    removeToken();
    removeUser();
    window.location.href = '/index.html';
}

// Vérification de l'authentification au chargement
document.addEventListener('DOMContentLoaded', () => {
    const user = getUser();
    updateNavigation(user);

    // Redirection si non authentifié sur le dashboard
    if (window.location.pathname === '/dashboard.html' && !user) {
        window.location.href = '/index.html';
    }
});
