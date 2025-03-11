// Variables globales
let currentUser = null;
let appointments = [];
let professionals = [];

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = getUser();
    if (!currentUser) {
        window.location.href = '/index.html';
        return;
    }

    // Afficher la section appropriée selon le rôle
    if (currentUser.role === 'professional') {
        document.querySelector('.professional-section').classList.remove('d-none');
        document.querySelector('.client-section').classList.add('d-none');
        await loadProfessionalDashboard();
    } else {
        await loadProfessionals();
    }

    // Charger les rendez-vous
    await loadAppointments();

    // Initialiser les filtres
    initializeFilters();
});

// Chargement des professionnels
async function loadProfessionals() {
    try {
        const response = await fetch('/api/users/professionals', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        const data = await response.json();
        
        if (response.ok) {
            professionals = data;
            updateProfessionalSelect();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des professionnels:', error);
    }
}

// Mise à jour de la liste des professionnels
function updateProfessionalSelect() {
    const select = document.getElementById('professionalSelect');
    select.innerHTML = '<option value="">Sélectionnez un professionnel</option>';
    professionals.forEach(professional => {
        select.innerHTML += `<option value="${professional._id}">${professional.name}</option>`;
    });
}

// Chargement des rendez-vous
async function loadAppointments() {
    try {
        const response = await fetch('/api/appointments', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        const data = await response.json();

        if (response.ok) {
            appointments = data;
            displayAppointments();
            updateStatistics();
        }
    } catch (error) {
        console.error('Erreur lors du chargement des rendez-vous:', error);
    }
}

// Affichage des rendez-vous
function displayAppointments() {
    const container = document.getElementById('appointmentsList');
    container.innerHTML = '';

    const filteredAppointments = filterAppointments();

    filteredAppointments.forEach(appointment => {
        const card = createAppointmentCard(appointment);
        container.appendChild(card);
    });
}

// Création d'une carte de rendez-vous
function createAppointmentCard(appointment) {
    const card = document.createElement('div');
    card.className = `card appointment-card ${appointment.status} mb-3`;
    
    const date = new Date(appointment.date);
    const statusBadgeClass = {
        'pending': 'bg-warning',
        'confirmed': 'bg-success',
        'cancelled': 'bg-danger'
    }[appointment.status];

    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h5 class="card-title">${appointment.reason}</h5>
                    <p class="card-text">
                        <i class="far fa-calendar"></i> ${date.toLocaleDateString()}<br>
                        <i class="far fa-clock"></i> ${date.toLocaleTimeString()}<br>
                        <i class="far fa-user"></i> ${appointment.professional?.name || 'Non assigné'}
                    </p>
                </div>
                <span class="badge ${statusBadgeClass}">${getStatusLabel(appointment.status)}</span>
            </div>
            ${createAppointmentActions(appointment)}
        </div>
    `;

    return card;
}

// Création des actions pour un rendez-vous
function createAppointmentActions(appointment) {
    if (currentUser.role === 'professional') {
        return `
            <div class="mt-3">
                ${appointment.status === 'pending' ? `
                    <button class="btn btn-success btn-sm" onclick="updateAppointmentStatus('${appointment._id}', 'confirmed')">
                        <i class="fas fa-check"></i> Confirmer
                    </button>
                ` : ''}
                ${appointment.status !== 'cancelled' ? `
                    <button class="btn btn-danger btn-sm" onclick="updateAppointmentStatus('${appointment._id}', 'cancelled')">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                ` : ''}
            </div>
        `;
    } else {
        return `
            <div class="mt-3">
                ${appointment.status !== 'cancelled' ? `
                    <button class="btn btn-danger btn-sm" onclick="cancelAppointment('${appointment._id}')">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                ` : ''}
            </div>
        `;
    }
}

// Mise à jour du statut d'un rendez-vous
async function updateAppointmentStatus(appointmentId, status) {
    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            await loadAppointments();
        } else {
            const data = await response.json();
            alert(data.message || 'Erreur lors de la mise à jour du rendez-vous');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la mise à jour du rendez-vous');
    }
}

// Création d'un nouveau rendez-vous
async function createAppointment() {
    const professional = document.getElementById('professionalSelect').value;
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const reason = document.getElementById('appointmentReason').value;

    if (!professional || !date || !time || !reason) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    const dateTime = new Date(date + 'T' + time);

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                doctor: professional, 
                date: dateTime.toISOString(),
                reason
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Rendez-vous créé avec succès');
            await loadAppointments();
            const modal = bootstrap.Modal.getInstance(document.getElementById('newAppointmentModal'));
            if (modal) {
                modal.hide();
            }
            // Réinitialiser le formulaire
            document.getElementById('professionalSelect').value = '';
            document.getElementById('appointmentDate').value = '';
            document.getElementById('appointmentTime').value = '';
            document.getElementById('appointmentReason').value = '';
        } else {
            alert(data.message || 'Erreur lors de la création du rendez-vous');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création du rendez-vous');
    }
}

// Chargement du tableau de bord professionnel
async function loadProfessionalDashboard() {
    try {
        // Charger les disponibilités actuelles
        const response = await fetch('/api/users/' + currentUser.id, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Mettre à jour les jours cochés
            const days = {
                'Lundi': 'btnLundi',
                'Mardi': 'btnMardi',
                'Mercredi': 'btnMercredi',
                'Jeudi': 'btnJeudi',
                'Vendredi': 'btnVendredi'
            };
            
            for (const [day, buttonId] of Object.entries(days)) {
                const checkbox = document.getElementById(buttonId);
                if (checkbox) {
                    checkbox.checked = data.availability.workingDays.includes(day);
                }
            }
            
            // Mettre à jour les horaires
            if (data.availability.workingHours) {
                document.getElementById('startTime').value = data.availability.workingHours.start;
                document.getElementById('endTime').value = data.availability.workingHours.end;
            }
            
            // Mettre à jour la pause déjeuner
            if (data.availability.breakTime) {
                document.getElementById('breakStartTime').value = data.availability.breakTime.start;
                document.getElementById('breakEndTime').value = data.availability.breakTime.end;
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des disponibilités:', error);
        alert('Erreur lors du chargement des disponibilités');
    }
}

// Mise à jour des disponibilités
async function updateAvailability() {
    const workingDays = [];
    const days = {
        'btnLundi': 'Lundi',
        'btnMardi': 'Mardi',
        'btnMercredi': 'Mercredi',
        'btnJeudi': 'Jeudi',
        'btnVendredi': 'Vendredi'
    };
    
    for (const [buttonId, day] of Object.entries(days)) {
        const checkbox = document.getElementById(buttonId);
        if (checkbox && checkbox.checked) {
            workingDays.push(day);
        }
    }
    
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const breakStartTime = document.getElementById('breakStartTime')?.value || '12:00';
    const breakEndTime = document.getElementById('breakEndTime')?.value || '14:00';
    
    if (!startTime || !endTime) {
        alert('Veuillez remplir les horaires de travail');
        return;
    }
    
    try {
        const response = await fetch('/api/users/' + currentUser.id, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                availability: {
                    workingDays,
                    workingHours: {
                        start: startTime,
                        end: endTime
                    },
                    breakTime: {
                        start: breakStartTime,
                        end: breakEndTime
                    }
                }
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Disponibilités mises à jour avec succès');
        } else {
            alert(data.message || 'Erreur lors de la mise à jour des disponibilités');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la mise à jour des disponibilités');
    }
}

// Filtrage des rendez-vous
function filterAppointments() {
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;

    return appointments.filter(appointment => {
        if (statusFilter && appointment.status !== statusFilter) return false;
        if (dateFilter) {
            const appointmentDate = new Date(appointment.date).toLocaleDateString();
            const filterDate = new Date(dateFilter).toLocaleDateString();
            if (appointmentDate !== filterDate) return false;
        }
        return true;
    });
}

// Initialisation des filtres
function initializeFilters() {
    document.getElementById('statusFilter').addEventListener('change', displayAppointments);
    document.getElementById('dateFilter').addEventListener('change', displayAppointments);
}

// Mise à jour des statistiques
function updateStatistics() {
    if (currentUser.role === 'professional') {
        const total = appointments.length;
        const confirmed = appointments.filter(a => a.status === 'confirmed').length;
        
        document.getElementById('totalAppointments').textContent = total;
        document.getElementById('confirmedAppointments').textContent = confirmed;
    }
}

// Utilitaires
function getStatusLabel(status) {
    return {
        'pending': 'En attente',
        'confirmed': 'Confirmé',
        'cancelled': 'Annulé'
    }[status];
}
