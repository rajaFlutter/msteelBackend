const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

let billSchema = mongoose.Schema({
    fullName: {
        type: schemaType.String
    },
    productName: {
        type: schemaType.String
    },
    orderQuantity: {
        type: schemaType.Number
    },
    totalAmount: {
        type: schemaType.Number
    },
    billDate: {
        type: schemaType.Date
    },
    orderNumber: {
        type: schemaType.Number
    }
});

const billModel = mongoose.model("bill", billSchema);

module.exports = billModel;