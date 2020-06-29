const functions = require('firebase-functions');
const app = require('express')();

const FBAuth = require('./utils/fbAuth');

const {getAllPosts, postOnePost} = require('./handlers/posts')
const { signup, login, addUserDetails } = require('./handlers/users');

app.get('/posts', getAllPosts);
app.post('/posts', FBAuth, postOnePost);

app.post('/signup', signup);
app.post('/login', login);

app.post('/user', FBAuth, addUserDetails);

exports.api = functions.https.onRequest(app); 