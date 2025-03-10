const nodemailer = require("nodemailer");
const Appointment = require("../models/appointments");
const User = require("../models/user");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: 'abidi.chayma83@gmail.com',
        pass: 'hgul hjlp pqsb lxfn',  // Assurez-vous d'utiliser un mot de passe d'application pour Gmail
    },
});

const sendEmail = async (appointmentId, subject, text) => {
    try {
        console.log("Appel de la fonction sendEmail avec l'ID du rendez-vous :", appointmentId);

        // Récupérer les informations du rendez-vous
        const appointment = await Appointment.findById(appointmentId).populate("doctor patient");
        
        if (!appointment) {
            throw new Error("Rendez-vous introuvable");
        }

        console.log("Détails du rendez-vous récupérés :", appointment);  // Vérifie si l'objet du rendez-vous est bien récupéré

        const patientEmail = appointment.patient.email;
        const doctorName = `${appointment.doctor.fullName} ${appointment.doctor.fullName}`;
        const patientName = `${appointment.patient.fullName} ${appointment.patient.fullName}`;
        
        // Formater la date pour un affichage correct
        const rdvDate = new Date(appointment.date);
        const formattedDate = rdvDate.toLocaleString('fr-FR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        // Crée le contenu de l'email
        const emailSubject = subject || "Votre rendez-vous est confirmé"; // Utilisation de la variable subject si fournie
        const emailText = text || `Bonjour ${patientName},\n\nVotre rendez-vous avec le Dr. ${doctorName} est confirmé pour le ${formattedDate}.\n\nMerci de votre confiance.`; 

        // Définir les options de l'email
        const mailOptions = {
            from: 'chaymaabididev@gmail.com',  // Corriger l'adresse email
            to: patientEmail,
            subject: emailSubject,
            text: emailText,
        };

        console.log("Options de l'email préparées :", mailOptions);  // Log pour vérifier les options

        // Envoi de l'email
        await transporter.sendMail(mailOptions);
        console.log("E-mail envoyé avec succès");

    } catch (error) {
        console.error("Erreur d'envoi de l'e-mail :", error);
    }
};

module.exports = sendEmail;
