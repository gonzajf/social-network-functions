const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { response, request } = require('express');

admin.initializeApp({
    credential: admin.credential.cert(require('./keys/social-network-16a8b-firebase-adminsdk-hv0kh-0182c1f48d.json'))
});

const express = require('express');
const app = express();

app.get('/posts', (request, response) => {

    admin.firestore().collection('posts').get()
    .then(data =>  {
        let posts = [];
        data.forEach(doc => {
            posts.push(doc.data());
        })
        return response.json(posts);
    })
    .catch(error => console.error(error));

});

app.post('/posts', (request, response) => {
  
    const newPost = {
        body: request.body.body,
        userHandle: request.body.userHandle,
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
    };

    admin.firestore().collection('posts')
        .add(newPost)
        .then(doc => {
            response.json({message: `document ${doc.id} created succesfully`})
        })
        .catch(error => {
            response.status(500).json({error: 'something went wrong'});
            console.error(error);
        });
});

exports.api = functions.https.onRequest(app); 