// add FCM utils

const admin = require('../config/firebaseAdmin.js');

const sendNotification = async (fcmToken, title, body, data = {}) => {
  const message = {
    notification: { title, body },
    token: fcmToken,
    data, // optional payload
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent:', response);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = sendNotification;