const {db} = require('../utils/admin');
const { error } = require('firebase-functions/lib/logger');
const { response } = require('express');

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
                    createdAt: doc.data().createdAt,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount,
                    userImage: doc.data().userImage
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
        userImage: request.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    db.collection('posts')
        .add(newPost)
        .then(doc => {
            const resPost = newPost;
            resPost.postId = doc.id;
            response.json({resPost});
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
      return doc.ref.update({commentCount: doc.data().commentCount+1});
    })   
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      response.json(newComment);
    })
    .catch(error => {
      console.log(error);
      response.status(500).json({error: 'Something went wrong'})
    });
};

exports.likePost = (request, response) => {

  const likeDocument = db.collection('likes').where('userHandle', '==', request.user.userHandle)
    .where('postId', '==', request.params.postId).limit(1);

  const postDocument = db.doc(`/posts/${request.params.postId}`);

  let postData;

  postDocument.get()
    .then(doc => {
      if(doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      }
      else {
        return response.status(404).json({error: 'Post not found'});
      }
    })
    .then(data => {
      if(data.empty) {
        return db.collection('likes').add({
          postId: request.params.postId,
          userHandle: request.user.userHandle
        })
        .then(() => {
          postData.likeCount++;
          return postDocument.update({likeCount: postData.likeCount});
        })
        .then(() => {
          return response.json(postData);
        })
      } 
      else {
        return response.status(400).json({error: 'Post already liked'});
      }
    })
    .catch(error => {
      console.log(error);
      response.status(500).json({error: error.code});
    })

};

exports.unlikePost = (request, response) => {

  const likeDocument = db.collection('likes').where('userHandle', '==', request.user.userHandle)
  .where('postId', '==', request.params.postId).limit(1);

  const postDocument = db.doc(`/posts/${request.params.postId}`);

  let postData;

  postDocument.get()
    .then(doc => {
      if(doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      }
      else {
        return response.status(404).json({error: 'Post not found'});
      }
    })
    .then(data => {
      if(data.empty) {
        return response.status(400).json({error: 'Post not liked'});
      
      } 
      else {
        return db.doc(`/likes/${data.docs[0].id}`).delete()
        .then(() => {
          postData.likeCount--;
          return postDocument.update({likeCount: postData.likeCount});
        })
        .then(() => {
          return response.json(postData);
        })
      }
    })
    .catch(error => {
      console.log(error);
      response.status(500).json({error: error.code});
    })
};

exports.deletePost = (request, response) => {

  const document = db.doc(`/posts/${request.params.postId}`);
  document.get()
    .then(doc => {
      if(!doc.exists) {
        return response.status(404).json({error: 'Post not found'});
      }
      if(doc.data().userHandle !== request.user.userHandle) {
        return response.status(403).json({error: 'Unauthorized'});
      }
      else {
        return document.delete();
      }
    })
    .then(() => {
      response.json({message: 'Post deleted succesfully'})
    })
    .catch(error => {
      console.log(error);
      return response.status(500).json({error: error.code});
    });
};