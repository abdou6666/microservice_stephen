const express = require("express");
const cors = require("cors");
const { randomBytes } = require("crypto");
const axios = require("axios");

const app = express();
app.use(express.json());
const commentsByPostId = {};

app.use(cors({ origin: '*' }))
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
})
app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const { content } = req.body;

    const comments = commentsByPostId[req.params.id] || [];

    comments.push({ id: commentId, content, status: 'pending' });

    commentsByPostId[req.params.id] = comments;

    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: { id: commentId, content, postId: req.params.id, stauts: 'pending' }
    })

    res.status(201).send(comments);
})

app.post('/events', async (req, res) => {
    console.log('event recieved', req.body.type);
    const { type, data } = req.body;
    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;

        const comments = commentsByPostId[postId];
        const comment = comments.find(comment => comment.id === id);
        comment.status = status;

        axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                status,
                postId,
                content
            }
        }).catch(err => console.error(err));
    }
    return res.send({})

})

app.listen(4001, () => {
    console.log("Comments Service : Listening on 4001");
})