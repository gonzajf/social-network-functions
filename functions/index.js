const functions = require('firebase-functions');
const app = require('express')();

const FBAuth = require('./utils/fbAuth');

const {getAllPosts, 
        postOnePost, 
        getPost, 
        commentOnPost, 
        likePost, 
        unlikePost } = require('./handlers/posts');

const { signup, login, addUserDetails, getAuthenticatedUser} = require('./handlers/users');

app.get('/posts', getAllPosts);
app.post('/posts', FBAuth, postOnePost);
app.get('/posts/:postId', getPost);
app.post('/post/:postId/comment', FBAuth, commentOnPost);
app.get('/posts/:postId/like', FBAuth, likePost);
app.get('/posts/:postId/unlike', FBAuth, unlikePost);


app.post('/signup', signup);
app.post('/login', login);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app); 