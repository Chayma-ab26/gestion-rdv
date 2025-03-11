let calendar;
let selectedDate;
let selectedTimeSlot;
let currentProfessional;

// Vérifier l'authentification
if (!localStorage.getItem('token')) {
    window.location.href = '/index.html';
}

// Récupérer l'ID du professionnel depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const professionalId = urlParams.get('id');

if (!professionalId) {
    window.location.href = '/professional-list.html';
}

// Charger les informations du professionnel
async function loadProfessionalInfo() {
    try {
        const response = await fetch(`/api/users/${professionalId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des informations');
        }

        const professional = await response.json();
        
        if (professional.role !== 'professional') {
            throw new Error('Utilisateur non trouvé ou n\'est pas un professionnel');
        }

        currentProfessional = professional;

        // Mettre à jour les informations affichées
        document.getElementById('professionalName').textContent = 
            `Dr ${professional.firstName} ${professional.lastName}`;
        document.getElementById('professionalSpecialty').textContent = professional.specialty;
        document.getElementById('professionalAddress').textContent = professional.address || 'Adresse non spécifiée';

        // Initialiser le calendrier avec les disponibilités
        initializeCalendar(professional);

        // Afficher les créneaux pour la date sélectionnée si elle existe
        if (selectedDate) {
            displayTimeSlots(professional, selectedDate);
        }
    } catch (error) {
        console.error('Erreur:', error);
        const errorMessage = 'Erreur lors du chargement des informations du professionnel. Veuillez réessayer.';
        showErrorMessage(errorMessage);
        // Rediriger vers la liste des professionnels en cas d'erreur
        setTimeout(() => {
            window.location.href = '/professional-list.html';
        }, 3000);
    }
}

// Fonction pour afficher un message d'erreur
function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        <strong>Erreur!</strong> ${message}
    `;

    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Initialiser le calendrier
function initializeCalendar(professional) {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: professional.availability.workingDays.includes('Samedi') || 
                 professional.availability.workingDays.includes('Dimanche'),
        businessHours: {
            daysOfWeek: professional.availability.workingDays.map(day => {
                const days = {
                    'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4,
                    'Vendredi': 5, 'Samedi': 6, 'Dimanche': 0
                };
                return days[day];
            }),
            startTime: professional.availability.workingHours.start,
            endTime: professional.availability.workingHours.end
        },
        dateClick: function(info) {
            // Désélectionner la date précédente
            document.querySelectorAll('.fc-day').forEach(day => {
                day.classList.remove('selected-day');
            });
            
            // Sélectionner la nouvelle date
            const dayEl = info.dayEl;
            dayEl.classList.add('selected-day');
            
            selectedDate = info.dateStr;
            displayTimeSlots(professional, info.dateStr);
        }
    });

    calendar.render();
    
    // Ajouter le style pour la date sélectionnée
    const style = document.createElement('style');
    style.textContent = `
        .fc-day.selected-day {
            background-color: var(--primary-color-light) !important;
        }
        .fc-day:hover {
            background-color: #f8f9fa !important;
            cursor: pointer;
        }
        .fc-day.fc-day-today {
            background-color: rgba(var(--primary-color-rgb), 0.1) !important;
        }
        .time-slots {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 0.5rem;
            padding: 1rem 0;
        }
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
        }
        .alert-info {
            background-color: #cff4fc;
            border: 1px solid #b6effb;
            color: #055160;
        }
        .alert-danger {
            background-color: #f8d7da;
            border: 1px solid #f5c2c7;
            color: #842029;
        }
    `;
    document.head.appendChild(style);
}

// Charger les disponibilités
async function loadProfessionalAvailability() {
    try {
        const response = await fetch(`/api/appointments/availability/${professionalId}?date=${selectedDate}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors du chargement des disponibilités');
        }

        const data = await response.json();
        const events = data.availableSlots.map(slot => ({
            title: 'Disponible',
            start: new Date(slot.datetime),
            end: new Date(new Date(slot.datetime).getTime() + 15 * 60000),
            backgroundColor: '#28a745',
            borderColor: '#28a745',
            textColor: '#fff'
        }));

        calendar.removeAllEvents();
        calendar.addEventSource(events);
        updateAvailabilityInfo(data.availability);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des disponibilités');
    }
}

// Afficher les créneaux horaires
async function displayTimeSlots(professional, selectedDate) {
    console.log('Affichage des créneaux pour:', selectedDate);
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '';

    try {
        // Vérifier si la date est dans le passé
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        if (selected < today) {
            timeSlotsContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle"></i>
                    Impossible de prendre rendez-vous dans le passé
                </div>
            `;
            return;
        }

        // Vérifier si c'est un jour travaillé
        const dayName = getDayName(selected);
        if (!professional.availability.workingDays.includes(dayName)) {
            timeSlotsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Le professionnel ne travaille pas ce jour-là
                </div>
            `;
            return;
        }

        // Récupérer les rendez-vous existants pour cette date
        const response = await fetch(`/api/appointments/availability/${professional._id}?date=${selectedDate}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des disponibilités');
        }

        const { bookedSlots } = await response.json();

        // Générer les créneaux disponibles
        const workStart = professional.availability.workingHours.start;
        const workEnd = professional.availability.workingHours.end;
        const breakStart = professional.availability.breakTime.start;
        const breakEnd = professional.availability.breakTime.end;

        const slots = generateTimeSlots(workStart, workEnd, breakStart, breakEnd);
        const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));

        if (availableSlots.length === 0) {
            timeSlotsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Aucun créneau disponible pour cette date
                </div>
            `;
            return;
        }

        // Créer un conteneur pour les créneaux
        const timeSlotsDiv = document.createElement('div');
        timeSlotsDiv.className = 'time-slots';

        // Ajouter chaque créneau
        availableSlots.forEach(time => {
            const slotDate = new Date(selectedDate);
            const [hours, minutes] = time.split(':');
            slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Désactiver les créneaux passés pour aujourd'hui
            const isDisabled = slotDate < new Date();
            
            const button = document.createElement('button');
            button.className = `time-slot${isDisabled ? ' disabled' : ''}`;
            button.setAttribute('data-datetime', slotDate.toISOString());
            button.setAttribute('type', 'button'); 
            if (isDisabled) {
                button.disabled = true;
            }
            button.innerHTML = `<i class="far fa-clock"></i> ${time}`;

            // Ajouter l'événement de clic directement
            if (!isDisabled) {
                button.onclick = function(e) {
                    e.preventDefault(); 
                    console.log('Clic sur le créneau:', time);
                    // Retirer la sélection précédente
                    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    // Ajouter la sélection au créneau cliqué
                    this.classList.add('selected');
                    // Ouvrir le modal
                    openAppointmentModal(slotDate.toISOString());
                };
            }

            timeSlotsDiv.appendChild(button);
        });

        // Ajouter le titre et les créneaux au conteneur
        timeSlotsContainer.innerHTML = `<h4>Créneaux disponibles pour le ${formatDate(selected)}</h4>`;
        timeSlotsContainer.appendChild(timeSlotsDiv);

    } catch (error) {
        console.error('Erreur:', error);
        timeSlotsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                Une erreur est survenue lors du chargement des créneaux
            </div>
        `;
    }
}

// Fonction pour ouvrir le modal de rendez-vous
function openAppointmentModal(dateTime) {
    console.log('Ouverture du modal pour:', dateTime);
    const modal = document.getElementById('appointmentModal');
    const dateInput = document.getElementById('appointmentDate');
    const errorElement = document.getElementById('appointmentError');
    
    // Réinitialiser les erreurs
    errorElement.textContent = '';
    
    // Formater la date pour l'affichage
    const date = new Date(dateTime);
    const formattedDate = date.toLocaleString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Stocker la date et l'heure
    dateInput.value = formattedDate;
    dateInput.setAttribute('data-datetime', dateTime);
    
    // Réinitialiser le formulaire
    document.getElementById('appointmentReason').value = '';
    
    // Afficher le modal
    modal.style.display = 'block';
    modal.classList.add('show');
    
    // Focus sur le champ de motif
    document.getElementById('appointmentReason').focus();
}

// Fonction pour fermer le modal de rendez-vous
function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    modal.style.display = 'none';
    modal.classList.remove('show');
    
    // Réinitialiser le formulaire
    document.getElementById('appointmentForm').reset();
    document.getElementById('appointmentError').textContent = '';
}

// Ajouter un gestionnaire pour fermer le modal en cliquant en dehors
window.addEventListener('click', function(event) {
    const modal = document.getElementById('appointmentModal');
    if (event.target === modal) {
        closeAppointmentModal();
    }
});

// Gestionnaire de soumission du formulaire de rendez-vous
document.getElementById('appointmentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const errorElement = document.getElementById('appointmentError');
    const reason = document.getElementById('appointmentReason').value.trim();
    const dateInput = document.getElementById('appointmentDate');
    const dateTime = dateInput.getAttribute('data-datetime');
    
    try {
        // Validation des champs
        if (!reason) {
            throw new Error('Veuillez saisir le motif du rendez-vous');
        }

        if (!dateTime) {
            throw new Error('Veuillez sélectionner un créneau horaire');
        }

        if (!currentProfessional || !currentProfessional._id) {
            throw new Error('Erreur: professionnel non sélectionné');
        }

        // Désactiver le bouton de soumission
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Création en cours...';

        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                professional: currentProfessional._id,
                date: dateTime,
                reason: reason
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la création du rendez-vous');
        }

        // Afficher le message de succès
        showSuccessMessage(data, reason, dateTime);
        
        // Recharger les créneaux disponibles
        await displayTimeSlots(currentProfessional, selectedDate);
        
    } catch (error) {
        console.error('Erreur:', error);
        errorElement.textContent = error.message;
        errorElement.style.display = 'block';
    } finally {
        // Réactiver le bouton de soumission
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-check me-2"></i>Confirmer';
    }
});

// Fonction pour afficher le message de succès
function showSuccessMessage(result, reason, dateTime) {
    const date = new Date(dateTime);
    const formattedDate = date.toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Fermer le modal
    closeAppointmentModal();

    // Créer et afficher l'alerte de succès
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        <strong>Rendez-vous créé avec succès!</strong><br>
        <div class="mt-2">
            <i class="far fa-calendar me-2"></i>${formattedDate}<br>
            <i class="far fa-user me-2"></i>${result.appointment.professional.specialty} ${result.appointment.professional.firstName} ${result.appointment.professional.lastName}<br>
            <i class="far fa-clipboard me-2"></i>${reason}
        </div>
    `;

    // Ajouter l'alerte au conteneur
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);

    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Supprimer l'alerte après 5 secondes
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Fonction utilitaire pour générer les créneaux horaires
function generateTimeSlots(workStart, workEnd, breakStart, breakEnd) {
    const slots = [];
    const interval = 15; // minutes - même durée que dans le modèle utilisateur

    // Convertir les heures en minutes
    const startMinutes = timeToMinutes(workStart);
    const endMinutes = timeToMinutes(workEnd);
    const breakStartMinutes = timeToMinutes(breakStart);
    const breakEndMinutes = timeToMinutes(breakEnd);

    // Générer les créneaux du matin
    for (let time = startMinutes; time < breakStartMinutes; time += interval) {
        slots.push(minutesToTime(time));
    }

    // Générer les créneaux de l'après-midi
    for (let time = breakEndMinutes; time < endMinutes; time += interval) {
        slots.push(minutesToTime(time));
    }

    return slots;
}

// Fonctions utilitaires pour la manipulation des heures
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function getDayName(date) {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[date.getDay()];
}

function formatDate(date) {
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Charger les informations au chargement de la page
loadProfessionalInfo();