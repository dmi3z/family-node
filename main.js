const express = require('express');
const bodyParser = require('body-parser');
const port = process.env.port || 3000;
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

var usersdb;
var tasksdb;
var listsdb;

const app = express();
const server = app
    .use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .listen(port, () => {
    console.log('1. Server started on port: ', port);
});

MongoClient.connect('mongodb+srv://dmi3z:xbvbb7c9@cluster0-unbvo.mongodb.net/test?retryWrites=true&w=majority', (err, database) => {
    if (err) {
        return console.log(err);
    }
    usersdb = database.db('users');
    tasksdb = database.db('tasks');
    listsdb = database.db('lists');
    console.log('2. Connection to DB was sucess!');
})


// --------- API --------------
app.get('/', (_, res) => {
    res.send('Welcome to FamilyTask API');
});

app.post('/auth', (req, res) => {
    const user = req.body;
    usersdb.collection('users').findOne({ email: user.email, password: user.password }, (err, result) => {
        if (err) {
            return res.sendStatus(500);
        }
        if (result) {
            res.send(result._id);
        } else {
            res.sendStatus(401);
        }
    });
});

app.get('/user', (req, res) => {
    const id = req.query.id;
    usersdb.collection('users').findOne({ _id: ObjectID(id) }, (err, user) => {
        if (err) {
            return res.sendStatus(500);
        }
        if (user) {
            res.send(JSON.stringify(user));
        } else {
            res.sendStatus(404);
        }
    });
});

app.get('/tasks', (req, res) => {
    const id = req.query.id;
    tasksdb.collection(id).findOne().toArray((err, result) => {
        if (err) {
            res.sendStatus(500);
        }
        if (result) {
            res.send(JSON.stringify(result));
        } else {
            res.sendStatus(404);
        }
    });
});

app.get('/lists', (req, res) => {
    const id = req.query.id;
    listsdb.collection(id).find().toArray((err, result) => {
        if (err) {
            res.sendStatus(500);
        }
        if (result) {
            res.send(JSON.stringify(result));
        } else {
            res.sendStatus(404);
        }
    });
});

app.post('/tasks', (req, res) => {
    const id = req.query.id;
    tasksdb.collection(id).insertOne(req.body, (err) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.sendStatus(200);
    });
});

app.post('/lists', (req, res) => {
    const id = req.query.id;
    listsdb.collection(id).insertOne(req.body, (err) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.sendStatus(200);
    });
});