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

const { signup, 
        login, 
        addUserDetails, 
        getAuthenticatedUser, 
        getUserDetails,
        markNotificationsRead } = require('./handlers/users');

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
app.get('/users/:userHandle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app); 

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
        .onCreate((snapshot) => {
                return db.doc(`/posts/${snapshot.data().postId}`)
                        .get()
                        .then(doc => {
                                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
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
                        .catch(error => console.error(error));
        });


exports.deleteNotificationOnUnLike = functions.firestore.document('likes/{id}')
        .onDelete((snapshot) => {
               return db.doc(`/notifications/${snapshot.id}`)
                        .delete()        
                        .catch(error => {
                                console.error(error);
                                return;
                        })
        });

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
        .onCreate((snapshot) => {
                return db.doc(`/posts/${snapshot.data().postId}`)
                        .get()
                        .then(doc => {
                                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                                        return db.doc(`/notifications/${snapshot.id}`).set({
                                                createAt: new Date().toISOString(),
                                                recipient: doc.data().userHandle,
                                                sender: snapshot.data().userHandle,
                                                type: 'comment',
                                                read: false,
                                                postId: doc.id
                                        });
                                }
                        })        
                        .catch(error => {
                                console.error(error);
                                return;
                        })
        });

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
        .onUpdate((change) => {
                console.log(change.before.data());
                console.log(change.after.data());
                if(change.before.data().imageUrl !== change.after.data().imageUrl) {
                        const batch = db.batch();
                        return db.collection('posts').where('userHandle', '==', change.before.data().userHandle).get()
                                .then(data => {
                                        data.forEach(doc => {
                                                const post = db.doc(`/post/${doc.id}`); 
                                                batch.update(post, {userImage: change.after.data().imageUrl});
                                        })
                                        return batch.commit();
                                })
                } else {
                        return true;
                }
        });

exports.onPostDelete = functions.firestore.document('/posts/{postId}')
        .onDelete((snapshot, context) => {
                const postId = context.params.postId;
                const batch = db.batch();                
                return db.collection('comments').where('postId', '==', postId).get()
                        .then(data => {
                                data.forEach(doc => {
                                        batch.delete(db.doc(`/comments/${doc.id}`)); 
                                })
                                return db.collection('likes').where('postId', '==', postId).get();
                        })
                        .then(data => {
                                data.forEach(doc => {
                                        batch.delete(db.doc(`/likes/${doc.id}`)); 
                                })
                                return db.collection('notifications').where('postId', '==', postId).get();
                        })
                        .then(data => {
                                data.forEach(doc => {
                                        batch.delete(db.doc(`/notifications/${doc.id}`)); 
                                })
                                return batch.commit();
                        })
                        .catch(error => {
                                console.error(error);
                        })
        });