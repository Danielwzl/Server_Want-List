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
    dob: Date,
    phone: String,
    token: String,
    post: [{
        image: String,
        title: String,
        desc: String,
        desire_level: Number,
        cost_level: Number,
        isMarked: Boolean,
        createdAt: Date
    }]
});

Authentications.plugin(timestamps);

module.exports = mongoose.model('Authentications', Authentications);
