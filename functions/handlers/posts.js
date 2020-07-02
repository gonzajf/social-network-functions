const {db} = require('../utils/admin');
const { error } = require('firebase-functions/lib/logger');

exports.getAllPosts = (request, response) => {

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
        .catch(error => {
            console.error(error);
            response.status(500).json({error: error.code});
        });
}

exports.postOnePost = (request, response) => {
  
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
}

 exports.getPost = (request, response) => {
  
  let postData = {};
  
  db.doc(`/posts/${request.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return response.status(404).json({ error: 'Post not found' });
      }
     
      postData = doc.data();
      postData.postId = doc.id;
     
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('postId', '==', request.params.postId)
        .get();
    })
    .then((data) => {
      postData.comments = [];
      data.forEach((doc) => {
        postData.comments.push(doc.data());
      });
      return response.json(postData);
    })
    .catch((err) => {
      console.error(err);
      response.status(500).json({ error: err.code });
    });
};

exports.commentOnPost = (request, response) => {

  if(request.body.body.trim() == '') {
    return response.status(400).json({error: 'Must not be empty'});
  }

  const newComment = {
    body: request.body.body,
    createdAt: new Date().toISOString(),
    postId: request.params.postId,
    userHandle: request.user.userHandle,
    userImage: request.user.userImage
  };

  db.doc(`/posts/${request.params.postId}`).get()
    .then(doc => {
      if(!doc.exists) {
        return response.status(404).json({error: 'Post not found'});
      }

      return db.collection('comments').add(newComment)
        .then(() => {
          response.json(newComment);
        })
        .catch(error => {
          console.log(error);
          response.status(500).json({error: 'Something went wrong'})
        })
    })
};