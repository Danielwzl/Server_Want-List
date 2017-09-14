var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Users = new mongoose.Schema({
    name: String,
    pass: String,
    email: String,
    rName: {
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
    phone: String,
    token: String,
    rating: String, //Change?
    postHistory: [
        {
            time: String,
            date: String,
            rating: String,
            description: String,
            type: String,
            place: String,
            comment: String
        }
    ],
    currentPost: [
        {
            time: String,
            date: String,
            description: String,
            type: String,
            place: String,
            message: String,
            maxppl: Number,
            ppl: []
        }

    ]

});



module.exports = mongoose.model('Users', Users);
