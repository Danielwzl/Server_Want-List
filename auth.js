var exp = require('express'),
    app = exp(),
    bp = require('body-parser'),
    mongoose = require('mongoose'),
    jwt = require('jsonwebtoken'),
    config = require('./config.js'),
    nodemailer = require('nodemailer'),
    fs = require('fs'),
    multer = require('multer'),
    Users = require('./models/authentication.js');

app.use(exp.static('public'));

app.use(bp.urlencoded({
    extended: false
}));
app.use(bp.json());

var userExist,
    userSession = {},
    dir = './uploads/user_files/',
    tempDir = dir + "tmp/",
    tempFile = '',
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, tempDir);
        },
        filename: function (req, file, cb) {
            if (file.fieldname === 'image')
                cb(null, (tempFile = file.originalname + '-' + Date.now() + "." + file.mimetype.split('/')[1]));
        }
    }),
    upload = multer({storage: storage});


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

app.get('/bestGiftSet', mostDesireGiftList);
app.post('/newDesireGift', upload.single('image'), postDesiredGift);
app.post('/updateAvatar', upload.single('image'), updateAvatar);
app.post('/removeOneGift', removeOneGift);
app.post('/markGift', markGift);
app.post('/updateGift', updateGift);
app.get('/showUserGift', showUserGift);
app.post('/getAvatar', getAvatar);


/*debug page wasted*/

/*
this is the way how to do the sort depending on the subdocuments in mongoose
*/
app.post('/getImage', (req,res) =>{ 
    Users.aggregate([
    {$match: {_id: mongoose.Types.ObjectId("59dff41cf332490ac0226460")}},
    { $unwind: "$post" },
    { $project: {
        updatedAt: '$post.updatedAt',
        "post" : 1,
        "document": "$$ROOT"

    }},
    { $sort: {updatedAt: 1}}
    ], function (err, data) { 
        if(err) res.send(null);
        if(data) {
            if(fs.existsSync(data[0].image)){
                   fs.readFile(data.post[0].image, function (err, file) {
                        if (err)
                            res.send(null);
                         else {
                            res.send({status: "ok", data : data, image: file});
                        }
                    });
            }
            else res.send(data);
        }
    });

});

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

app.post('/file', upload.single('image'), (req,res)=>{
   console.log(req.body);
   console.log(req.file);
   res.json({status: "ok"});
});
/*debug page wasted*/

/*deal with user login*/
app.post('/serverLogin', (req, res) => {
    var nick_name = req.body.nick_name,
        pass = req.body.password;
    if (nick_name.match(/\w+\@\w+(\.\w+)+/))
    {
        obj = {
            email: nick_name //it will check user use either email or username
        };
        authUser(obj, pass, res); //auth user
    }
    else res.json({status: "please use email.."});
    // else obj = {
    //     nick_name: nick_name
    // };

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
        avatar: "default",
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
                if (data._id) generateUserDir(data._id);
                res.json({
                    name: data.nick_name,
                    token: data._id //as their new sid
                });
            });
        }
        else res.json({exist: userExist});
    });
});

app.post('/logout', function (req, res) {
    var flag = false;
    if (userSession[req.body.id]) { //if there is session and user hit logout button
        delete userSession[req.body.id]; //delete from session array
        console.log(userSession);
        console.log(req.body.id + ": logout");
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

/*update user personal information TODO test*/
app.post('/updatePersonalInfo', (req, res) => {
if(auth(req.body.id)){
        var obj = {
            rName: {
                lName: req.body.lName,
                fName: req.body.fName
            },
            gender: req.body.gender,
            dob: req.body.dob,
            nick_name: req.body.nick_name
    //        address: {
    //            unit: req.body.unit,
    //            street: req.body.street,
    //            city: req.body.city,
    //            province: req.body.province,
    //            country: req.body.country,
    //            pcode: req.body.pcode
    //        },
    //        phone: req.body.phone
        };
        console.log(obj);
        Users.findOneAndUpdate({
            _id: req.body.id
        }, obj, (err, data) => {
            if (err) return res.send(null);

            if (data) res.json({
                status: "ok"
            });
            else res.json({
                status: "fail"
            });
        });
    }
    else res.send(null);
});

/*get user profile- updated*/
app.post('/getUserProfile', (req, res) => {
    if (!req.body._id) return;
    Users.findOne(req.body, '-__v', (err, data) => {
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
        if(!auth(req.body.id)) return res.send("please log in")
        Users.findOne({
                _id: req.body.id 
            },
            'nick_name token', (err, data) => {
                if (err) {
                    return res.send(null);
                } else {
                    if (!data) return res.send(null);
                    var name = req.body.newName || data.nick_name, //get name for making token
                        token = req.body.newPass ? generateToken(name, req.body.newPass) : data.token; //if there is new password, generate token otherwise user old password
                    console.log(token + ", " + data.token);
                    if (name != null) {
                        Users.findOneAndUpdate({
                            _id: req.body.id
                        }, {
//                            nick_name: name,
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
        obj,
        avatars = {};
    switch (type) {
        case 'nick_name' :
            obj = {nick_name: value};
            break;
        case 'name':
            if(value){
                var names = value.split(" ");
                obj = {"full_name.fName": names[0], "full_name.lName": names[1]};
            }
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


    if (true || auth(req.body.id)) {
        if (!obj) return res.json({res: null});
        Users.find(obj, '_id full_name dob avatar gender', (err, data) => {
            if (err) return res.send(null);
            if (data) {
                for(let i = 0, len = data.length; i < len; i++){
                     if(fs.existsSync(data[i].avatar)){
                            if(fs.existsSync(data[i].avatar)){
                                avatars[data[i].id] = fs.readFileSync(data[i].avatar);
                                data[i].avatar = "file";
                        }
                    }
                }
                return res.json({status: "ok", res: data, imageData: avatars});
            }
            return res.json({res: null});
        });
    } else return res.send('need log in');
});


/*check username and password by using token*/
function authUser(obj, pass, res) {
    var status = 'fail',
        token, data, userData;
    var avatar;
    Users.findOne(obj, "-post -__v -share", (err, data) => {
        if (err) return res.send(null);
        if (!data) {
            console.log('user not exists');
        } else {
            token = jwt.decode(data.token);
            if (pass === token.pass) {
                status = 'ok';
                token = data._id;
                userData = {
                    nick_name: data.nick_name,
                    email:data.email,
                    gender: data.gender,
                    full_name: data.full_name,
                    dob: data.dob,
                    phone: data.phone
                };
                if(data.avatar != "default" && fs.existsSync(data.avatar)){
                    avatar = fs.readFileSync(data.avatar)
                }
            } else token = null;
        }
        if (token) {
            userSession[data._id] = { //use token as sessionID
                name: data.nick_name
            };
            console.log(userSession);
            console.log('logged in');
        }

        res.json({
            user: userData,
            status: status,
            token: token,
            avatar: null
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


function updateAvatar(req, res) {
    var body = req.body;
    if (auth(body.id)) {
        var file = req.file;
        var picDir = dir + body.id + "/pics/avatar/";
        if (fs.existsSync(picDir) && fs.existsSync(tempDir + tempFile))
            moveFile(tempDir + tempFile, picDir + tempFile);
        Users.findOneAndUpdate({_id: req.body.id}, {avatar: picDir + tempFile}, (err, data) => {
            if (err)  res.send(null);
            if (data) res.json({status: "ok"});
            else res.send(null);
        });
    } else {
        fs.unlinkSync(tempDir + tempFile);
        res.send("please log in");
    }
}


function readImage(data, path, i) {
    return new Promise((resolve, reject) => {
             if(fs.existsSync(path)){
                 fs.readFile(path, function (err, file) {
                     if(file) {
                         data.post[i].image = 123;
                         console.log(file);
                     }
                 });
         }
         setTimeout(function () {
             resolve("Success!");
         }, 250);
     });
 }

function userExists(phone, email) {
    return new Promise((resolve, reject) => {
         Users.findOne({phone: phone}, '_id', (err, data) => {
             if (err) return res.send(null);
             if (data) userExist = "phone";
             if (!userExist) {
                 Users.findOne({email: email}, '_id', (err, data) => {
                     if (err) return res.send(null);
                     if (data) userExist = "email";
                 });
             }
         });
         setTimeout(function () {
             resolve("Success!");
         }, 250);
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
    if (auth(body.id)) {
        var file = req.file;
        var picDir = dir + body.id + "/pics/post/";
        if (fs.existsSync(picDir) && fs.existsSync(tempDir + tempFile))
            moveFile(tempDir + tempFile, picDir + tempFile);
        var now = new Date();
        var obj = {
            image: file.size == 0 ? "default" : picDir + tempFile,
            imageName: file.originalname,
            title: body.title,
            desc: body.desc,
            desire_level: body.desire_level,
            cost_level: body.cost_level,
            isMarked: "none",
            createdAt: now,
            updatedAt: now,
        };
        console.log(obj);
        Users.findOneAndUpdate({_id: body.id}, {"$push": {"post": obj}}, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                res.json({status: 'ok'});
            }
            else res.send(null);
        });
    }
    else {
        fs.unlinkSync(tempDir + tempFile);
        return res.send("please log in");
    }

}

function moveFile(src, des) {
    fs.createReadStream(src).pipe(fs.createWriteStream(des));
    fs.unlinkSync(src);
}

function removeOneGift(req, res) {
    var body = req.body;
    if (auth(body.id) && body.owner_id == body.id) {
        Users.findOneAndUpdate({_id: body.id}, {"$pull": {"post": {_id: body.post_id}}}, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                console.log(data);
                res.json({status: 'ok'});
            }
            else res.send(null);
        });
    } else res.send(null);
}

function updateGift(req, res) {
    var body = req.body;
    var updateData = generateUpdateData(req.body, "post");
    if (auth(body.id)) {
        Users.findOneAndUpdate({_id: body.id, "post._id": body.gift_id}, updateData, (err, data) => {
            if (err) return res.send(null);
            if (data) {
                console.log(data.post);
                res.json({status: 'ok'});
            }
            else res.send(null);
        });
    } else return res.send("please log in");
}

function showUserGift(req, res) {
    var body = req.query;
    var promises = [];
    var temp = {};
    if (auth(body.id)) {
        Users.findOne({_id: body.view_id}, '-_id -token -phone -email -share', (err, data) => {
            if (err) return res.send(null);
            if (data) {
                if( data.post){
                 var imageData = null;
                        for(let i = 0, len = data.post.length; i < len; i++){
                            if(fs.existsSync(data.post[i].image)){
                                if(fs.existsSync(data.post[i].image)){
                                    imageData = fs.readFileSync(data.post[i].image);
                                    temp[data.post[i].id] = imageData;
                                    data.post[i].image = "file";
                            }
                        }
                    }
                }
                res.json({status: 'ok', data: data, imageData: temp});
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
    var post_id = body.post_id,
    view_id= body.view_id,
    id= body.id;
    if (view_id != id && auth(id)) {
        Users.findOne({
            _id: view_id,
            "post._id": post_id
        },  { 'post.$': 1 }, (err, data) => {
            if (err) return res.send(null);
            if (data) {

               var mark = data.post[0].isMarked;
                var notMarked = mark == "none";
               if(notMarked || mark == id){
               Users.update({
                    _id: view_id,
                     "post._id": post_id
               }, {"$set": {"post.$.isMarked": notMarked ? body.id : "none"}}, (err, data)=>{
                      if(err) res.send(null);

                     if(data.n > 0){
                         res.json({status: 'ok'});
                    }
                    else res.send(null);
                });
               }
               else res.send(null);
            } else res.send(null);
        });
    } else res.json({error: "login pls, or mark on own post"});
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

function generateUserDir(id) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    var tmpDir = dir + 'tmp/';
    if (!fs.existsSync(dir + 'tmp/')) {
        fs.mkdirSync(tmpDir);
    }
    var userDir = dir + id + '/';
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir);
    }
    var picDir = userDir + 'pics/';
    if (!fs.existsSync(picDir)) {
        fs.mkdirSync(picDir);
    }
    var avatarDir = picDir + 'avatar/';
    var postDir = picDir + 'post/';
    var shareDir = picDir + 'shareDir/';
    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir);
    }
    if (!fs.existsSync(postDir)) {
        fs.mkdirSync(postDir);
    }
    if (!fs.existsSync(shareDir)) {
        fs.mkdirSync(shareDir);
    }
}

function getAvatar(req, res){
    var id = req.body.id;
    if( auth(id)){
          Users.findOne({_id: id}, "-_id avatar", function (err, data) {
                if(err) res.send(null);
                if(data) {
                    if(fs.existsSync(data.avatar)){
                           fs.readFile(data.avatar, function (err, file) {
                                if (err)
                                    res.send(null);
                                 else {
                                    res.send({status: "ok", image: file});
                                }
                            });
                    }
                    else res.send(data[0]);
                }
            });
    }
}