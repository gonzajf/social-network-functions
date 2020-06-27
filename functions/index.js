const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('./keys/social-network-16a8b-firebase-adminsdk-hv0kh-0182c1f48d.json'))
});

const firebaseConfig = {
    apiKey: "AIzaSyCDOVI3C4JEuUwavw4qMeEVQRA6e-TW3g8",
    authDomain: "social-network-16a8b.firebaseapp.com",
    databaseURL: "https://social-network-16a8b.firebaseio.com",
    projectId: "social-network-16a8b",
    storageBucket: "social-network-16a8b.appspot.com",
    messagingSenderId: "859201943712",
    appId: "1:859201943712:web:ed3766f9648c06c998b1c5",
    measurementId: "G-T2376YVMK8"
  };


const express = require('express');
const app = express();
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get('/posts', (request, response) => {

    db.collection('posts')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data =>  {
            let posts = [];
            data.forEach(doc => {
                posts.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            })
            return response.json(posts);
        })
        .catch(error => console.error(error));

});

app.post('/posts', (request, response) => {
  
    const newPost = {
        body: request.body.body,
        userHandle: request.body.userHandle,
        createdAt: new Date().toISOString()
    };

    db.collection('posts')
        .add(newPost)
        .then(doc => {
            response.json({message: `document ${doc.id} created succesfully`})
        })
        .catch(error => {
            response.status(500).json({error: 'something went wrong'});
            console.error(error);
        });
});

app.post('/signup', (request, response) => {

    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userHandle: request.body.userHandle
    };

    //TODO validate data
    let token, userId;

    db.doc(`/users/${newUser.userHandle}`).get()
        .then(doc => {
            if(doc.exists) {
                return response.status(400).json({userHandle: 'This userHandle is already taken'});
            } else {
                return firebase
                        .auth()
                        .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(tokenPromise => {
            
            token = tokenPromise;
            const userCredentials = {
                userHandle: newUser.userHandle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId: userId
            };
            return db.doc(`/users/${newUser.userHandle}`).set(userCredentials);
        })
        .then(() => {
            return response.status(201).json({ token });
        })
        .catch(error => {
            console.error();
            if(error.code === 'auth/email-already-in-use') {
                return response.status(400).json({email: 'Email is already in use'});    
            } else {
                return response.status(500).json({error: error.code});
            }
        });
});

exports.api = functions.https.onRequest(app); 