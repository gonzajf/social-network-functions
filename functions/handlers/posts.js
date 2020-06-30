const {db} = require('../utils/admin');

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

 exports.getPost = (req, res) => {
        let postData = {};
        db.doc(`/posts/${req.params.postId}`)
          .get()
          .then((doc) => {
            if (!doc.exists) {
              return res.status(404).json({ error: 'Scream not found' });
            }
            postData = doc.data();
            postData.postId = doc.id;
            return db
              .collection('comments')
              .orderBy('createdAt', 'desc')
              .where('postId', '==', req.params.postId)
              .get();
          })
          .then((data) => {
            postData.comments = [];
            data.forEach((doc) => {
              postData.comments.push(doc.data());
            });
            return res.json(postData);
          })
          .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
          });
      };