const functions = require('firebase-functions');
const app = require('express')();

const FBAuth = require('./utils/fbAuth');

const { db } = require('./utils/admin');

const {getAllPosts, 
        postOnePost, 
        getPost, 
        commentOnPost, 
        likePost, 
        unlikePost,
        deletePost } = require('./handlers/posts');

const { signup, login, addUserDetails, getAuthenticatedUser} = require('./handlers/users');

app.get('/posts', getAllPosts);
app.post('/posts', FBAuth, postOnePost);
app.get('/posts/:postId', getPost);
app.delete('/posts/:postId', FBAuth, deletePost);
app.post('/post/:postId/comment', FBAuth, commentOnPost);
app.get('/posts/:postId/like', FBAuth, likePost);
app.get('/posts/:postId/unlike', FBAuth, unlikePost);

app.post('/signup', signup);
app.post('/login', login);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app); 

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
        .onCreate((snapshot) => {
                db.doc(`/posts/${snapshot.data().postId}`).get()
                        .then(doc => {
                                if(doc.exists) {
                                        return db.doc(`/notifications/${snapshot.id}`).set({
                                                createAt: new Date().toISOString(),
                                                recipient: doc.data().userHandle,
                                                sender: snapshot.data().userHandle,
                                                type: 'like',
                                                read: false,
                                                postId: doc.id
                                        });
                                }
                        })
                        .then(() => {
                                return;
                        })        
                        .catch(error => {
                                console.errro(error);
                                return;
                        })
        });