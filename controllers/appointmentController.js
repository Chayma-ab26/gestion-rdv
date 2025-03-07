const Appointment = require('../models/Appointment');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

exports.createAppointment = async (req, res) => {
  const { professional, date } = req.body;
  console.log('Données reçues :', req.body);

  try {
    const appointment = new Appointment({
      client: req.user.id,
      professional,
      date,
    });

    console.log('Avant sauvegarde du rendez-vous'); 
    await appointment.save();
    console.log('Rendez-vous sauvegardé'); 

    const client = await User.findById(req.user.id);
    console.log('Client récupéré :', client); 
    const pro = await User.findById(professional);
    console.log('Pro récupéré :', pro); 

    await sendEmail(
      client.email,
      'Nouveau rendez-vous créé',
      `Votre rendez-vous avec ${pro.name} est confirmé pour le ${new Date(date).toLocaleString()}.`
    );
    console.log('E-mail client envoyé'); 

    await sendEmail(
      pro.email,
      'Nouveau rendez-vous reçu',
      `Vous avez un rendez-vous avec ${client.name} le ${new Date(date).toLocaleString()}.`
    );
    console.log('E-mail pro envoyé'); 

    res.status(201).json(appointment);
  } catch (err) {
    console.error('Erreur dans createAppointment :', err); 
    res.status(500).json({ message: 'Erreur serveur', error: err });
  }
};