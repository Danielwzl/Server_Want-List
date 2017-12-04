/**
 * Created by WANGZ on 2017-09-15.
 */
var mongoose = require("mongoose");
var timestamps = require('mongoose-timestamp');

var Authentications = new mongoose.Schema({
    nick_name: String,
    avatar: String,
    email: String,
    gender: String,
    full_name: {
        lName: String,
        fName: String
    },
    address: {
        unit: String,
        street: String,
        city: String,
        province: String,
        country: String,
        pcode: String
    },
    dob: String,
    phone: String,
    token: String,
    friend: [{
              userid: String,
              isFriend: Boolean
             }],
    post: [{
        image: String,
        imageName: String,
        title: String,
        desc: String,
        desire_level: Number,
        cost_level: Number,
        isMarked: String,
        createdAt: Date,
        updatedAt: Date
    }],
    share:[
        {
            image: String,
            content: String,
            comments: [
                {
                    post_user_id: String,
                    comment: String,
                    createdAt: Date
                }
            ],
            like: Number
        }
    ]
});

Authentications.plugin(timestamps);

module.exports = mongoose.model('Authentications', Authentications);
