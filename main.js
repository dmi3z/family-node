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

app.get('/userinfo', (req, res) => {
    const userId = req.query.user_id;
    const token = req.query.id;
    if (token) {
        usersdb.collection('users').findOne({ _id: ObjectID(userId )}, (err, user) => {
            if (err) {
                return res.sendStatus(500);
            }
            if (!user) {
                res.sendStatus(404);
            } else {
                const u = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    relations: user.relations
                };
                res.send(JSON.stringify(u));
            }

        })
    }
})

app.post('/user', (req, res) => {
    const user = req.body;
    const token = req.query.id;
    delete user._id;
    usersdb.collection('users').updateOne({ _id: ObjectID(token) }, { $set: { ...user }}), (err) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.send({ token });
    };
});

app.get('/tasks', (req, res) => {
    const id = req.query.id;
    tasksdb.collection(id).find().toArray((err, result) => {
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
    const task = req.body;
    if (task && task._id) {
        const taskId = task._id;
        delete task._id;
        tasksdb.collection(id).updateOne({_id: ObjectID(taskId)}, {$set: {...task } }, (err) => {
            if (err) {
                return res.sendStatus(500);
            }
            if (task.share_id) {
                if (task.task_id) {
                    task.is_alien = true;
                    task.from_id = id;
                    tasksdb.collection(task.share_id).updateOne({ _id: ObjectID(task.task_id) }, { $set: { ...task }}, (err) => {
                        if (err) {
                            return res.sendStatus(500);
                        }
                        res.send(JSON.stringify({ _id: taskId }));
                    });
                } else {
                    task.is_alien = true;
                    task.from_id = id;
                    tasksdb.collection(task.share_id).insertOne(task, (err, data) => {
                        if (err) {
                            return res.sendStatus(500);
                        }
                        task.task_id = data.insertedId.toString();
                        delete task._id;
                        task.is_alien = false;
                        task.from_id = null;
                        tasksdb.collection(id).updateOne({_id: ObjectID(taskId)}, {$set: {...task } }, (err) => {
                            if (err) {
                                return res.sendStatus(500);
                            }
                            res.send(JSON.stringify({ _id: taskId, task_id: data.insertedId }));
                        });
                    });
                }
            } else {
                res.send(JSON.stringify(task));
            }
        })
    } else {
        if (task.share_id) {
            task.is_alien = true;
            task.from_id = id;
            tasksdb.collection(task.share_id).insertOne(task, (err, data) => {
                if (err) {
                    return res.sendStatus(500);
                }
                task.is_alien = false;
                task.task_id = data.insertedId.toString();
                task.from_id = null;
                tasksdb.collection(id).insertOne(task, (err, vendor) => {
                    if (err) {
                        return res.sendStatus(500);
                    }
                    res.send(JSON.stringify({ _id: vendor.insertedId, task_id: data.insertedId.toString() }));
                });
            });
        } else {
            tasksdb.collection(id).insertOne(task, (err, data) => {
                if (err) {
                    return res.sendStatus(500);
                }
                res.send(JSON.stringify({ _id: data.insertedId }));
            });
        }        
    }
});

app.post('/lists', (req, res) => {
    const id = req.query.id;
    const list = req.body;
    if (list && list._id) {
        const listId = list._id;
        delete list._id;
        listsdb.collection(id).updateOne({_id: ObjectID(listId)}, {$set: {...list } }, (err) => {
            if (err) {
                return res.sendStatus(500);
            }
            if (list.share_id) {
                if (list.list_id) {
                    list.is_alien = true;
                    list.from_id = id;
                    listsdb.collection(list.share_id).updateOne({ _id: ObjectID(list.list_id) }, { $set: { ...list }}, (err) => {
                        if (err) {
                            return res.sendStatus(500);
                        }
                        res.send({ id });
                    });
                } else {
                    list.is_alien = true;
                    list.from_id = id;
                    listsdb.collection(list.share_id).insertOne(list, (err) => {
                        if (err) {
                            return res.sendStatus(500);
                        }
                        res.send({ id });
                    });
                }
            } else {
                res.send(JSON.stringify(list));
            }
        })
    } else {
        if (list.share_id) {
            list.is_alien = true;
            list.from_id = id;
            listsdb.collection(list.share_id).insertOne(list, (err, data) => {
                if (err) {
                    return res.sendStatus(500);
                }
                list.is_alien = false;
                list.list_id = data.insertedId.toString();
                list.from_id = null;
                listsdb.collection(id).insertOne(list, (err) => {
                    if (err) {
                        return res.sendStatus(500);
                    }
                    res.send({ id });
                });
            });
        } else {
            listsdb.collection(id).insertOne(list, (err) => {
                if (err) {
                    return res.sendStatus(500);
                }
                res.send({ id });
            });
        }        
    }
});

app.delete('/task', (req, res) => {
    const user_id = req.query.id;
    const taskId = req.query.taskid;
    tasksdb.collection(user_id).findOne({ _id: ObjectID(taskId)}, (err, task) => {
        if (err) {
            return res.sendStatus(500);
        }
        if (task && task.share_id) {
            tasksdb.collection(task.share_id).deleteOne({ _id: ObjectID(task.task_id)}, (err) => {
                if (err) {
                    return res.sendStatus(500);
                }
            });  
        }   
    });
    tasksdb.collection(user_id).deleteOne({_id: ObjectID(taskId)}, (err) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.send({ taskId });
    });

});

app.delete('/list', (req, res) => {
    const user_id = req.query.id;
    const listId = req.query.listid;
    listsdb.collection(user_id).findOne({ _id: ObjectID(listId)}, (err, list) => {
        if (err) {
            return res.sendStatus(500);
        }
        if (list && list.share_id) {
            listsdb.collection(list.share_id).deleteOne({ _id: ObjectID(list.list_id)}, (err) => {
                if (err) {
                    return res.sendStatus(500);
                }
            });  
        }   
    });
    listsdb.collection(user_id).deleteOne({_id: ObjectID(listId)}, (err) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.send({ listId });
    });
});

app.post('/invites', (req, res) => {
    const fromId = req.query.id;
    const toEmail = req.body.email;
    usersdb.collection('users').findOne({ email: toEmail }, (err, user) => {
        if (err) {
            return res.sendStatus(500);
        }
        if (user) {
            const invite = {
                from: fromId,
                to: user._id.toString()
            };
            usersdb.collection('invites').findOne({ from: invite.from, to: invite.to }, (err, result) => {
                if (err) {
                    return res.sendStatus(500);
                }
                if (result) {
                    res.send({ fromId });
                } else {
                    usersdb.collection('invites').insertOne(invite, err => {
                        if (err) {
                            return res.sendStatus(500);
                        }
                        res.send({ fromId });
                    })
                }
            })
        }  else {
            res.sendStatus(404);
        }
    })
});

app.get('/invites', (req, res) => {
    const id = req.query.id;
    usersdb.collection('invites').find({ to: id }).toArray((err, result) => {
        if (err) {
            return res.sendStatus(500);
        }
        res.send(JSON.stringify(result));
    })
});

app.post('/invite', (req, res) => {
    const id = req.query.id;
    const from = req.body.from;
    usersdb.collection('invites').findOne({ from: from, to: id }, (err, invites) => {
        if (err) {
            return res.sendStatus(500);
        }
        if (invites) {
            usersdb.collection('users').updateOne({ _id: ObjectID(id) }, { $push: { relations: from } }, (err) => {
                if (err) {
                    return res.sendStatus(500);
                }
                usersdb.collection('users').updateOne({ _id: ObjectID(from) }, {$push: { relations: id }}, (err) => {
                    if (err) {
                        return res.sendStatus(500);
                    }
                    usersdb.collection('invites').deleteOne({ from: from, to: id }, (err) => {
                        if (err) {
                            return res.sendStatus(500);
                        }
                        res.send({ id });
                    })
                });
            });
        } else {
            res.sendStatus(404);
        }
    })
});
