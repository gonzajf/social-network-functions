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
const { response } = require('express');
const { error } = require('firebase-functions/lib/logger');
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


const FBAuth = (request, response, next) => {

    let idToken;

    if(request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
        idToken = request.headers.authorization.split('Bearer ')[1];
    } 
    else {
        console.error('No token found');
        
        return response.status(403).json({ error: 'Unauthorized' });
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            request.user = decodedToken;
            return db.collection('users')
                    .where('userId', "==", request.user.uid)
                    .limit(1)
                    .get();
        })
        .then(data => {
            request.user.userHandle = data.docs[0].data().userHandle;
            return next();
        })
        .catch(error => {
            console.error('Error while verifying token');
            return response.status(403).json(error);
        });
}

app.post('/posts', FBAuth, (request, response) => {
  
    const newPost = {
        body: request.body.body,
        userHandle: request.user.userHandle,
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

const isEmpty = (string) => {
    return string.trim() === '' ? true : false;
}

const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return email.match(emailRegEx) ? true : false;
}

app.post('/signup', (request, response) => {

    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userHandle: request.body.userHandle
    };

    let errors = {};
    //TODO validate data
    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty';
    } else if(!isEmail(newUser.email)) { 
        errors.email = 'Must be a valid email adress';
    }

    if(isEmpty(newUser.password)) {
        errors.password = 'Must not be empty';
    }
    if(newUser.password !== newUser.confirmPassword) {
        errors.confirmPassword = 'Passwords must match';
    }
    if(isEmpty(newUser.userHandle)) {
        errors.userHandle = 'Must not be empty';
    }

    if(Object.keys(errors).length > 0) {
        return response.status(400).json(errors);
    }

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

app.post('/login', (request, response) => {

    const user = {
        email: request.body.email,
        password: request.body.password
    };

    let errors = {};

    if(isEmpty(user.email)) {
        errors.email = 'Must not be empty';
    }
    if(isEmpty(user.password)) {
        errors.password = 'Must not be empty';
    }

    if(Object.keys(errors).length > 0) {
        return response.status(400).json(errors);
    }

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return response.json({ token });
        })
        .catch(error => {
            console.error();
            if(error.code === 'auth/wrong-password') {
                return response.status(403).json({ general: 'Wrong credentials. Please try again.'})
            }
            return response.status(500).json({error: error.code});
        });
});

exports.api = functions.https.onRequest(app); 