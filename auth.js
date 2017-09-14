var exp = require('express'),
    app = exp(),
    bp = require('body-parser'),
    mongoose = require('mongoose'),
    jwt = require('jsonwebtoken'),
    config = require('./config.js'),
    nodemailer = require('nodemailer'),
    Users = require('./models/users.js');

app.use(exp.static('public'));

app.use(bp.urlencoded({
    extended: false
}));

//sign up
//login
//forget password
//send user session token



/*start sever in 3002*/
var server = app.listen(3002, (err) => {
    if (err) console.log('error');
    else {
        var port = server.address().port;
        console.log('sever started at localhost:%s', port);
        mongoose.connection.openUri(config.database); //connect to mongodb
    }
});


// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gymmatchupmru@gmail.com',
        pass: 'zwang719'
    }
});

/*debug page wasted*/
app.get('/', function (req, res) {
    res.send('hello');
});

/*deal with user login*/
app.post('/serverLogin', (req, res) => {
    var name = req.body.name,
        pass = req.body.pass;
    if (name.match(/\w+\@\w+(\.\w+)+/)) obj = {
        email: name //it will check user use either email or username
    };
    else obj = {
        name: name
    };
    authUser(obj, pass, res); //auth user
});

/*sign up for new user*/
app.post('/newUser', (req, res) => {
    var usr = new Users({
        name: req.body.name,
        pass: req.body.pass,
        email: req.body.email,
        rName: {
            lName: req.body.lName,
            fName: req.body.fName
        },
        address: {
            unit: req.body.unit,
            street: req.body.street,
            city: req.body.city,
            province: req.body.province,
            country: req.body.country,
            pcode: req.body.pcode
        },
        phone: req.body.phone,
        token: generateToken(req.body.name, req.body.pass)
    });
    usr.save((err, data) => {
        console.log('data saved');
        res.json({
            name: data.name,
            token: data._id //as their new sid
        });
    });
});

/*check if user exist*/
app.post('/serverCheck', (req, res) => {
    var exist = false;
    Users.findOne(req.body, (err, data) => {
        if (err) throw err;
        if (data) exist = true;
        res.json({
            exist: exist
        });
    });
});

/*save new match up post to dbs*/
//RANDY April 1 2017 make query right changes
app.post('/savePost', (req, res) => {
    var saved = false,
        post = req.body,
        times = formatTimeAndDate(post.time),
        obj_json = {
            time: times.time,
            date: times.date,
            description: post.des,
            place: post.meetplace + '|' + post.gym + '|' + post.branch,
            type: post.type,
            maxppl: post.maxppl,
            ppl: [],
            postTime: post.postTime
        },
        obj = JSON.stringify(obj_json);
    Users.findOneAndUpdate({
        _id: post.id
    }, {
        $push: {
            currentPost: obj
        }
    }, (err, data) => {
        if (err) throw err;
        if (data)
            res.json(obj_json);
        else res.send(false);
    });
});

/*update user persional infomation*/
app.post('/updatePersonalInfo', (req, res) => {
    var obj = {
        rName: {
            lName: req.body.lName,
            fName: req.body.fName
        },
        address: {
            unit: req.body.unit,
            street: req.body.street,
            city: req.body.city,
            province: req.body.province,
            country: req.body.country,
            pcode: req.body.pcode
        },
        phone: req.body.phone
    }

    Users.findOneAndUpdate({
        name: req.body.name
    }, obj, (err, data) => {
        if (err) throw err;

        if (data) res.json({
            done: true
        });
        else res.json({
            done: false
        });
    });
});

/*get user profile- updated*/
app.post('/getUserProfile', (req, res) => {
    if (!req.body._id) return;
    Users.findOne(req.body, '-_id -__v', (err, data) => {
        if (err) throw err;
        res.send(data);
    });
});

/*send server email to user*/
app.post('/emailForPsw', (req, res) => {
    Users.findOne({
        email: req.body.email
    }, (err, data) => {
        if (err) throw err;
        else {
            if (!data) {
                res.json({
                    exist: false,
                    meg: "user not found"
                });
            } else {
                let mailOptions = {
                    from: '"(noreply)password reset" <gymmatchupmru@gmail.com>', // sender address
                    to: data.email, // list of receivers
                    subject: 'Gym match up reset password', // Subject line
                    text: 'click link to complete reset password', // plain text body
                    html: '<b>click link to complete reset password:</b> <a href = "http://localhost:3000/resetpsw/' + req.body.sid + '">reset password</a>'
                };
                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        return;
                    }
                });
                res.json({
                    exist: true,
                    meg: "user found"
                });
            }
        }
    });
});

/*for reset or update password or username(account info)*/
app.post('/serverUpdate', (req, res) => {
    if (req.body.type == 'resetPass') {
        Users.findOne({
                email: req.body.email || req.body.name, //different key all refer to email, this is one solution for bad structure 
            },
            'name token pass', (err, data) => {
                if (err) {
                    throw err;
                } else {
                    if (!data) return;
                    var name = req.body.newName || data.name, //get name for making token
                        token = req.body.newPass ? generateToken(name, req.body.newPass) : data.token; //if there is new password, generate token otherwise user old password
                    if (name != null) {
                        Users.findOneAndUpdate({
                            name: data.name
                        }, {
                            name: name,
                            pass: req.body.newPass || data.pass,
                            token: token
                        }, (err, data) => {
                            if (err) throw err;
                            else {
                                if (!data) {
                                    console.log('no user found');
                                } else {
                                    res.json({
                                        done: true
                                    });
                                }
                            }
                        });
                    }
                }
            });
    }
});


/*check username and password by using token*/
function authUser(obj, pass, res) {
    var status = 'fail',
        token, name;
    Users.findOne(obj, (err, data) => {
        if (err) throw err;
        if (!data) {
            console.log('user not exists');
        } else {
            token = jwt.decode(data.token);
            if (pass == token.pass) {
                status = 'ok';
                token = data._id;
                name = data.name;
            } else token = null;
        }

        if (!res) return;
        res.json({
            name: name,
            status: status,
            token: token
        });
    });
}

/*making a new token*/
function generateToken(name, pass) {
    return jwt.sign({
        name: name,
        pass: pass
    }, 'secret', {
        expiresIn: 60 * 60
    });
}

/*take data and time in proper format*/
function formatTimeAndDate(time) {
    var data = time.split('T');
    return {
        date: data[0],
        time: data[1]
    }

}
