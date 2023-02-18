const mongoose = require("mongoose");
const schemaType = mongoose.Schema.Types;

let advertisementSchema = mongoose.Schema({
    image: {
        type: schemaType.String,
    },
    url: {
        type: schemaType.String,
    }

});

const advertisementModel = mongoose.model("advertisement", advertisementSchema);

module.exports = advertisementModel;