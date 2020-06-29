const {admin, db} = require('../utils/admin');
const firebaseConfig = require('../keys/firebaseConfig');
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const {validateSignUpData, validateLoginData, reduceUserDetails } = require('../utils/validators');
const e = require('express');

exports.signup = (request, response) => {

    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userHandle: request.body.userHandle
    };

    const {valid, errors} = validateSignUpData(newUser);

    if(!valid) {
        response.status(400).json(errors);
    }
   
    const noImg = 'noImg.png';

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
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${noImg}?alt=media`,
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
}

exports.login = (request, response) => {

    const user = {
        email: request.body.email,
        password: request.body.password
    };

    const {valid, errors} = validateLoginData(user);

    if(!valid) {
        response.status(400).json(errors);
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
}

//TODO change profile image

exports.addUserDetails = (request, response) => {

    let userDetails = reduceUserDetails(request.body);

    db.doc(`/users/${request.user.userHandle}`).update(userDetails)
        .then(() => {
            return response.json({message: 'Details added succesfully'});
        })
        .catch(error => {
            console.error();
            return response.status(500).json({error: error.code});
        })
}