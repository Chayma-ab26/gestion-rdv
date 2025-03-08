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

// Fonction pour afficher/masquer les champs spécifiques selon le rôle
function toggleRoleSpecificFields() {
    const role = document.getElementById('registerRole').value;
    const clientFields = document.getElementById('clientFields');
    const professionalFields = document.getElementById('professionalFields');
    
    if (role === 'client') {
        clientFields.classList.remove('d-none');
        professionalFields.classList.add('d-none');
        document.getElementById('registerBirthDate').required = true;
        document.getElementById('registerSpecialty').required = false;
    } else if (role === 'professional') {
        clientFields.classList.add('d-none');
        professionalFields.classList.remove('d-none');
        document.getElementById('registerBirthDate').required = false;
        document.getElementById('registerSpecialty').required = true;
    } else {
        clientFields.classList.add('d-none');
        professionalFields.classList.add('d-none');
        document.getElementById('registerBirthDate').required = false;
        document.getElementById('registerSpecialty').required = false;
    }
}

// Fonction pour afficher les erreurs
function showError(message) {
    const errorDiv = document.getElementById('registerError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('d-none');
}

// Fonction pour masquer les erreurs
function hideError() {
    const errorDiv = document.getElementById('registerError');
    errorDiv.classList.add('d-none');
}

// Gestionnaire du formulaire d'inscription
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const role = document.getElementById('registerRole').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    // Validation du mot de passe
    if (password !== confirmPassword) {
        showError('Les mots de passe ne correspondent pas');
        return;
    }

    if (password.length < 6) {
        showError('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    // Création de l'objet utilisateur
    const userData = {
        firstName: document.getElementById('registerFirstName').value,
        lastName: document.getElementById('registerLastName').value,
        email: document.getElementById('registerEmail').value,
        phone: document.getElementById('registerPhone').value,
        address: document.getElementById('registerAddress').value,
        password: password,
        confirmPassword: confirmPassword,
        role: role
    };

    // Ajout des champs spécifiques selon le rôle
    if (role === 'client') {
        userData.birthDate = document.getElementById('registerBirthDate').value;
    } else if (role === 'professional') {
        userData.specialty = document.getElementById('registerSpecialty').value;
    }

    try {
        const response = await fetch('/api/users/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de l\'inscription');
        }

        // Stockage du token et redirection
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
    } catch (error) {
        showError(error.message);
    }
});

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

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la connexion');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/dashboard.html';
    } catch (error) {
        alert(error.message);
    }
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Vérification de l'état de connexion au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const loginNav = document.getElementById('loginNav');
    const registerNav = document.getElementById('registerNav');
    const dashboardNav = document.getElementById('dashboardNav');
    const logoutNav = document.getElementById('logoutNav');

    if (token) {
        loginNav.classList.add('d-none');
        registerNav.classList.add('d-none');
        dashboardNav.classList.remove('d-none');
        logoutNav.classList.remove('d-none');
    } else {
        loginNav.classList.remove('d-none');
        registerNav.classList.remove('d-none');
        dashboardNav.classList.add('d-none');
        logoutNav.classList.add('d-none');
    }
});
