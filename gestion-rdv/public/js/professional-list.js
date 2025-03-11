// Variables globales
let selectedProfessionalId = null;
let professionals = [];
let calendar = null;
let selectedDate = null;
let selectedTimeSlot = null;

// Fonction pour récupérer le type de professionnel depuis l'URL
function getProfessionalType() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('type');
}

// Fonction pour charger les professionnels
async function loadProfessionals() {
    try {
        const type = getProfessionalType();
        if (!type) {
            throw new Error('Type de professionnel non spécifié');
        }

        // Vérifier si l'utilisateur est connecté
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }

        // Convertir le type pour correspondre à l'enum dans le modèle
        const specialtyMap = {
            'medecin': 'médecin',
            'coach': 'coach',
            'avocat': 'avocat',
            'psychologue': 'psychologue',
            'dentiste': 'dentiste',
            'kinesitherapeute': 'kinésithérapeute',
            // Versions avec accents (pour la robustesse)
            'médecin': 'médecin',
            'kinésithérapeute': 'kinésithérapeute'
        };

        const specialty = specialtyMap[type.toLowerCase()];
        if (!specialty) {
            throw new Error(`Type de professionnel non reconnu: ${type}`);
        }

        console.log('Recherche des professionnels de type:', specialty);

        showLoadingSpinner();

        const response = await fetch(`/api/users/list-professionals?specialty=${encodeURIComponent(specialty)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Erreur lors du chargement des professionnels');
        }

        hideLoadingSpinner();
        
        if (!Array.isArray(data) || data.length === 0) {
            document.getElementById('professionalsList').innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Aucun professionnel disponible pour cette spécialité.
                    </div>
                </div>
            `;
            return;
        }

        displayProfessionals(data);
        
        // Mise à jour du titre de la page avec la version correcte du type
        const titleCase = specialty.charAt(0).toUpperCase() + specialty.slice(1);
        document.getElementById('pageTitle').textContent = `Liste des ${titleCase}s`;

    } catch (error) {
        console.error('Erreur:', error);
        hideLoadingSpinner();
        
        document.getElementById('professionalsList').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${error.message}
                </div>
            </div>
        `;
    }
}

// Fonction pour afficher le spinner de chargement
function showLoadingSpinner() {
    const container = document.getElementById('professionalsList');
    container.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <p class="mt-2">Recherche des professionnels...</p>
        </div>
    `;
}

// Fonction pour cacher le spinner de chargement
function hideLoadingSpinner() {
    // Le spinner sera remplacé par le contenu
}

// Fonction pour afficher les professionnels
function displayProfessionals(professionals) {
    const container = document.getElementById('professionalsList');
    container.innerHTML = '';

    professionals.forEach(professional => {
        const card = document.createElement('div');
        card.className = 'professional-card mb-4 p-4 bg-white rounded shadow-sm';
        
        // Formater les horaires de travail
        const workingDays = professional.availability?.workingDays?.join(', ') || 'Non spécifié';
        const workingHours = professional.availability?.workingHours 
            ? `${professional.availability.workingHours.start} - ${professional.availability.workingHours.end}`
            : 'Non spécifié';

        card.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="professional-avatar me-4">
                    <i class="fas fa-user-md fa-3x text-primary"></i>
                </div>
                <div class="professional-info flex-grow-1">
                    <h3 class="mb-2">Dr ${professional.firstName} ${professional.lastName}</h3>
                    <p class="mb-2"><i class="fas fa-stethoscope me-2"></i>${professional.specialty}</p>
                    <p class="mb-2"><i class="fas fa-map-marker-alt me-2"></i>${professional.address || 'Adresse non spécifiée'}</p>
                    <p class="mb-2"><i class="fas fa-calendar-alt me-2"></i>${workingDays}</p>
                    <p class="mb-3"><i class="fas fa-clock me-2"></i>${workingHours}</p>
                    <button class="btn btn-primary" onclick="window.location.href='/booking.html?id=${professional._id}'">
                        <i class="fas fa-calendar-plus me-2"></i>Prendre rendez-vous
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Fonction pour ouvrir le modal de prise de rendez-vous
function openAppointmentModal(professionalId) {
    selectedProfessionalId = professionalId;
    const professional = professionals.find(p => p._id === professionalId);
    
    // Mise à jour des informations du professionnel
    document.getElementById('doctorName').textContent = `Dr ${professional.firstName} ${professional.lastName}`;
    document.getElementById('doctorAddress').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${professional.address}`;
    document.getElementById('doctorSpecialty').innerHTML = `<i class="fas fa-stethoscope"></i> ${professional.specialty}`;
    
    // Initialisation du calendrier
    initializeCalendar(professional);
    
    // Afficher le modal
    const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
    modal.show();
}

// Fonction pour initialiser le calendrier
function initializeCalendar(professional) {
    const calendarEl = document.getElementById('calendar');
    if (calendar) {
        calendar.destroy();
    }

    // Charger les disponibilités du professionnel
    loadProfessionalAvailability(professional._id);

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,dayGridMonth'
        },
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        slotDuration: '00:15:00',
        allDaySlot: false,
        firstDay: 1,
        height: 'auto',
        selectable: true,
        selectMirror: true,
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5], // Lundi au Vendredi
            startTime: '09:00',
            endTime: '17:00',
        },
        select: function(info) {
            const selectedDateTime = info.start;
            const currentDate = new Date();
            
            // Empêcher la sélection de dates passées
            if (selectedDateTime < currentDate) {
                calendar.unselect();
                return;
            }

            selectedDate = info.startStr;
            updateTimeSlots(professional, info.startStr);
        },
        eventClick: function(info) {
            if (info.event.title === 'Disponible') {
                selectedDate = info.event.start.toISOString().split('T')[0];
                selectedTimeSlot = info.event.start.toTimeString().slice(0, 5);
                highlightSelectedTimeSlot(selectedTimeSlot);
            }
        }
    });

    calendar.render();
}

// Fonction pour charger les disponibilités du professionnel
async function loadProfessionalAvailability(professionalId) {
    try {
        const response = await fetch(`/api/users/professionals/${professionalId}/availability`, {
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
            end: new Date(new Date(slot.datetime).getTime() + 15 * 60000), // +15 minutes
            backgroundColor: '#4CAF50',
            borderColor: '#4CAF50',
            textColor: '#fff'
        }));

        calendar.removeAllEvents();
        calendar.addEventSource(events);

        // Mettre à jour les informations de disponibilité
        updateAvailabilityInfo(data.availability);
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des disponibilités');
    }
}

// Fonction pour mettre à jour les créneaux horaires
function updateTimeSlots(professional, date) {
    const selectedDateTime = new Date(date);
    const dayName = getDayName(selectedDateTime);
    const workingHours = professional.availability.workingHours;
    
    const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 15);
    const container = document.getElementById('timeSlots');
    container.innerHTML = '';

    timeSlots.forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = time;
        slot.onclick = () => selectTimeSlot(time);
        container.appendChild(slot);
    });
}

// Fonction pour générer les créneaux horaires
function generateTimeSlots(start, end, interval) {
    const slots = [];
    let current = new Date(`2000-01-01T${start}`);
    const endTime = new Date(`2000-01-01T${end}`);

    while (current < endTime) {
        slots.push(current.toTimeString().slice(0, 5));
        current = new Date(current.getTime() + interval * 60000);
    }

    return slots;
}

// Fonction pour mettre en surbrillance le créneau horaire sélectionné
function highlightSelectedTimeSlot(time) {
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
        if (slot.textContent === time) {
            slot.classList.add('selected');
        }
    });
}

// Fonction pour obtenir le nom du jour
function getDayName(date) {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[date.getDay()];
}

// Fonction pour mettre à jour les informations de disponibilité
function updateAvailabilityInfo(availability) {
    const workingDays = availability.workingDays.join(', ');
    const workingHours = `${availability.workingHours.start} - ${availability.workingHours.end}`;
    
    const infoHtml = `
        <div class="availability-info mb-3">
            <p><i class="fas fa-calendar-alt"></i> Jours de travail : ${workingDays}</p>
            <p><i class="fas fa-clock"></i> Horaires : ${workingHours}</p>
            <p><i class="fas fa-hourglass-half"></i> Durée de consultation : ${availability.slotDuration} minutes</p>
        </div>
    `;

    const container = document.querySelector('.time-slots-container');
    container.insertAdjacentHTML('afterbegin', infoHtml);
}

// Fonction pour réserver un rendez-vous
async function bookAppointment() {
    try {
        if (!selectedDate || !selectedTimeSlot) {
            alert('Veuillez sélectionner une date et un horaire');
            return;
        }

        const reason = document.getElementById('appointmentReason').value;
        if (!reason) {
            alert('Veuillez indiquer le motif du rendez-vous');
            return;
        }

        const datetime = `${selectedDate}T${selectedTimeSlot}`;
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                doctor: selectedProfessionalId,
                date: datetime,
                reason: reason
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de la création du rendez-vous');
        }

        alert('Rendez-vous créé avec succès !');
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Erreur:', error);
        alert(error.message);
    }
}

// Fonction pour appliquer les filtres
function applyFilters() {
    const searchName = document.getElementById('searchName').value.toLowerCase();
    const searchLocation = document.getElementById('searchLocation').value.toLowerCase();

    const filteredProfessionals = professionals.filter(professional => {
        const fullName = `${professional.firstName} ${professional.lastName}`.toLowerCase();
        const location = professional.address.toLowerCase();

        return fullName.includes(searchName) && location.includes(searchLocation);
    });

    displayProfessionals(filteredProfessionals);
}

// Charger les professionnels au chargement de la page
document.addEventListener('DOMContentLoaded', loadProfessionals);