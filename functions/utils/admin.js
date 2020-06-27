const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('../keys/social-network-16a8b-firebase-adminsdk-hv0kh-0182c1f48d.json'))
});

const db = admin.firestore();

module.exports = {admin, db};