const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(require('./keys/social-network-16a8b-firebase-adminsdk-hv0kh-0182c1f48d.json'))
});

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello world!");
});

exports.getPosts = functions.https.onRequest((request, response) => {
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

exports.createPost = functions.https.onRequest((request, response) => {
  
    if(request.method !== 'POST') {
        return response.status(400).json({error: 'Method not allowed'});
    }

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