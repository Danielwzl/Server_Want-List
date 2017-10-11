var exp = require('express'),
    app = exp(),
    bp = require('body-parser'),
    mongoose = require('mongoose'),
    jwt = require('jsonwebtoken'),
    config = require('./config.js'),
    nodemailer = require('nodemailer'),
    Users = require('./models/authentication.js');

app.use(exp.static('public'));

app.use(bp.urlencoded({
    extended: false
}));


var userExist,
    userSession = {};

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
    console.log("requested");
    res.json({res: 'hello'});
});

app.get('/test', function (req, res) {
    console.log("request" + req.query.id + ", " + req.query.name);
    res.json({res: {a: 1, b: "dan"}});
});

app.post('/post', function (req, res) {
    console.log("request: " + req.body.id + " , " + req.body.name);
    res.json({res: {a: 1, b: "dan"}});
});
/*debug page wasted*/

/*deal with user login*/
app.post('/serverLogin', (req, res) => {
    var nick_name = req.body.nick_name,
        pass = req.body.password;
    if (nick_name.match(/\w+\@\w+(\.\w+)+/)) obj = {
        email: nick_name //it will check user use either email or username
    };
    else obj = {
        nick_name: nick_name
    };
    authUser(obj, pass, res); //auth user
});

/*sign up for new user*/
app.post('/newUser', (req, res) => {
    userExist = null;
    var usr = new Users({
        nick_name: req.body.nick_name,
        email: req.body.email,
        full_name: {
            lName: req.body.lName,
            fName: req.body.fName
        },
//        address: {
//            unit: req.body.unit,
//            street: req.body.street,
//            city: req.body.city,
//            province: req.body.province,
//            country: req.body.country,
//            pcode: req.body.pcode
//        },
        gender: req.body.gender,
        phone: req.body.phone,
        dob: req.body.dob,
        token: generateToken(req.body.nick_name, req.body.password)
    });

    var exist = userExists(req.body.phone, req.body.email);
    exist.then(function () {
        if (!userExist) {
            usr.save((err, data) => {
                console.log('new user here');
                userSession[data._id] = {
                    name: data.nick_name
                };
                res.json({
                    name: data.nick_name,
                    token: data._id //as their new sid
                });
            });
        }
        else res.json({exist : userExist});
    });
});

app.post('/logout/:id', function (req, res) {
    var flag = false;
    if (userSession[req.params.id]) { //if there is session and user hit logout button
        delete userSession[req.params.id]; //delete from session array
        console.log(userSession);
        console.log(req.params.id + ": logout");
        flag = true;
    }
    res.json({
        logout: flag
    });
});

/*check if user exist*/
app.post('/serverCheck', (req, res) => {
    var exist = false;
    Users.findOne(req.body, (err, data) => {
        if (err) return res.send(null);
        if (data) exist = true;
        res.json({
            exist: exist
        });
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
    };

    Users.findOneAndUpdate({
        name: req.body.name
    }, obj, (err, data) => {
        if (err) return res.send(null);

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
        if (err) return res.send(null);
        res.send(data);
    });
});

/*send server email to user*/
app.post('/emailForPsw', (req, res) => {
    Users.findOne({
        email: req.body.email
    }, (err, data) => {
        if (err)return res.send(null);
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
                    subject: 'reset password', // Subject line
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
    if (req.body.type === 'resetPass') {
        Users.findOne({
                email: req.body.email || req.body.name, //different key all refer to email, this is one solution for bad structure 
            },
            'name token pass', (err, data) => {
                if (err) {
                    return res.send(null);
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
                            if (err) return res.send(null);
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

app.post('/searchUser', (req, res) => {
    var type = req.body.type,
        value = req.body.value,
        obj;
    switch (type) {
        case 'nick_name' :
            obj = {nick_name: value};
            break;
        case 'name':
            obj = {name: value};
            break;
        case 'phone':
            obj = {phone: value};
            break;
        case 'email':
            obj = {email: value};
            break;
        case 'dob':
            obj = {dob: value};
            break;
    }

    if (auth(req.body.id)) {
        if (!obj) return res.json({res: null});
        Users.find(obj, '_id nick_name full_name dob avatar', (err, data) => {
            if (err) return res.send(null);
            if (data) {
                return res.json({res: data});
            }
            return res.json({res: null});
        });
    } else return res.send('need log in');
});

app.get('/bestGiftSet', mostDesireGiftList);
app.post('/newDesireGift', postDesiredGift);
app.post('/removeOneGift', removeOneGift);
app.post('/markGift', markGift);
app.post('/updateGift', updateGift);
app.get('/showUserGift', showUserGift);

/*check username and password by using token*/
function authUser(obj, pass, res) {
    var status = 'fail',
        token, name;
    Users.findOne(obj, (err, data) => {
        if (err) return res.send(null);
        if (!data) {
            console.log('user not exists');
        } else {
            token = jwt.decode(data.token);
            if (pass === token.pass) {
                status = 'ok';
                token = data._id;
                name = data.name;
            } else token = null;
        }

        if (!res) return;
        if (token) {
            userSession[data._id] = { //use token as sessionID
                name: data.nick_name
            };
            console.log(userSession);
            console.log('logged in');
        }
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
        nick_name: name,
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

function userExists(phone, email) {
       return Users.findOne({phone: phone}, '_id', (err, data) => {
        if (err) return res.send(null);
        if(data) userExist = "phone";
                if(!userExist){

                    Users.findOne({email: email}, '_id', (err, data) => {
                                  if (err) return res.send(null);
                                  if(data) userExist = "email";
                              });
                }
    });
}

/**
 * if user select couples of item and wanna figure out what is the lowest price which can get
 * most-desired list of gift of his friend
 * @param req
 * @param res
 * @returns {*}
 */
function mostDesireGiftList(req, res) {
    if (!req.headers.items || !req.headers.cap) return res.json({opt: null});
    var name,
        item,
        dpKey,
        tempTotal,
        prevItemValue,
        ans = [],
        max = 0,
        dpValue,
        items = req.headers.items;
    cap = req.headers.cap;
    dp = [];

    //initial ary
    for (var i = cap; i >= 0; i--) {
        dp[i] = {
            0: []
        };
    }
    //compressed dp with storing optimization sets
    //dp ary has optimized value along with its' sets
    for (var i = 0, numOfItem = items.length; i < numOfItem; i++) {
        name = Object.keys(items[i])[0];
        item = items[i][name];
        for (var j = cap; j >= item[1]; j--) {
            dpKey = ~~Object.keys(dp[j])[0]; //target value
            prevItemValue = ~~Object.keys(dp[j - item[1]])[0]; //if w is 8, it should find max value of w 2 (10-8=2), total w = 10
            tempTotal = prevItemValue + item[0]; //get the rest biggest value
            if (dpKey < tempTotal) {
                delete dp[j][dpKey];
                dpKey = tempTotal; //get current total of this set
                dpValue = []; //empty temp ary
                dpValue.push(name); //put current set into set ary, concat with cap [target - current] elements
                dpValue = dpValue.concat(dp[j - item[1]][prevItemValue]);
                //console.log(i + ", " + j + ", " + (j - item[1]) + " : " + dp[j - item[1]][prevItemValue]);
                dp[j][dpKey] = dpValue; //assign all set back to dp ary
            }
        }
    }

    for (var i = 0, len = dp.length; i < len; i++) {
        if (max < ~~Object.keys(dp[i])[0]) {
            max = ~~Object.keys(dp[i])[0];
        }
    }
    for (var i = 0, len = dp.length; i < len; i++) {
        if (max === ~~Object.keys(dp[i])[0]) {
            ans.push(dp[i]);
        }
    }
    res.json({opt: ans});
}

/**
 * TODO this function will tell user which item is most wanted by all users etc
 * @param req
 * @param res
 */
function analysisData(req, res) {

}

function postDesiredGift(req, res) {
    var body = req.body;
    var now = new Date();
    var obj = {
        image: body.image,
        title: body.title,
        desc: body.desc,
        desire_level: body.desire_level,
        cost_level: body.cost_level,
        isMarked: false,
        createdAt: now,
        updatedAt: now,
    };
    if (auth(body.id)) {
        Users.findOneAndUpdate({_id: body.id}, {"$push": {"post": obj}}, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                res.json([{status: 'ok'}]);
            }
            else res.send(null);
        });
    }
    else return res.send("please log in");

}

function removeOneGift(req, res) {
    var body = req.body;
    console.log(req.body);
    if (auth(body.id)) {
        Users.findOneAndUpdate({_id: body.id}, {"$pull": {"post": {_id: body.gift_id}}}, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                console.log(data.post);
                res.json([{status: 'ok'}]);
            }
            else res.send(null);
        });
    } else return res.send("please log in");
}

function updateGift(req, res) {
    var body = req.body;
    var updateData = generateUpdateData(req.body, "post");
    if (auth(body.id)) {
        Users.findOneAndUpdate({_id: body.id, "post._id": body.gift_id}, updateData, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                console.log(data.post);
                res.json([{status: 'ok'}]);
            }
            else res.send(null);
        });
    } else return res.send("please log in");
}

function showUserGift(req, res) {
    var body = req.query;
    if (true || auth(body.id)) {
        Users.findOne({_id: body.view_id}, '-_id post nick_name full_name avatar dob', (err, data) => {
            if (err) return res.send(null);

            if (data) {
                console.log(data);
                res.json([{status: 'ok', data: data}]);
            }
            else res.send(null);

        });

    } else return res.send("please log in");
}


//TODO everyone below
function removeManyGift(req, res) {

}

//TODO maybe not use this function
function postReceivedGift(req, res) {

}

//TODO maybe not use this function
//TODO should be anynomise
function leftCommentOnPost(req, res) {

}

function markGift(req, res) {
    var body = req.body;
    if (true || auth(body.id)) {
        Users.findOneAndUpdate({
            _id: body.id,
            "post._id": body.gift_id
        }, {"$set": {"post.$.isMarked": true}}, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                console.log(data.post);
                res.json([{status: 'ok'}]);
            } else res.send(null);
        });
    } else return res.send("please log in");
}


function auth(id) {
    return userSession[id] !== undefined;
}

function generateUpdateData(body, column) {
    let stmt = {$set: {}};
    for (let item in body) {
        stmt.$set[column + ".$." + item] = body[item + ""];
    }
    stmt.$set[column + ".$." + "updatedAt"] = new Date();
    return stmt;
}

