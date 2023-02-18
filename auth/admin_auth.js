require("dotenv").config();
const express = require("express");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../model/user_model");
const orderModel = require("../model/orders_model");
const adminModel = require("../model/admin_model");
const { jwtKey, adminKey } = require("../constData");
const multer = require("multer");
const enquiryModel = require("../model/enquiry_model");
const stockModel = require("../model/stock_model");
const { Client } = require("twilio/lib/twiml/VoiceResponse");
const paymentModel = require("../model/payment_model");
const billModel = require("../model/bill_model");
const moment = require("moment");
const cloudinary = require("cloudinary").v2;

const cron = require("node-cron");



cron.schedule("0 0 0 * * *", async () => {
    try {
        const paymentData = await paymentModel.find();
        let userFullName = "";
        let userNumber = "";

        const orderData = await Promise.all(paymentData.filter((payment) => {
            if (payment.totalOutstandingPayment === payment.totalPaidAmount) {
                userFullName = payment.fullName;
                userNumber = payment.number;
                orderModel.findOne({ orderNumber: payment.orderNumber }).exec((err, result) => {
                    if (err) return res.status(400).json({ msg: err.message });
                    return result;
                });
            }
        })
        );

        if (orderData.length > 0) {
            let billData = new billModel({
                fullName: orderData.fullName,
                productName: orderData.productName,
                orderQuantity: orderData.orderQuantity,
                totalAmount: orderData.orderAmount,
                billDate: new Date().toISOString(),
                orderNumber: orderData.orderNumber
            });

            billData = await billModel.save();

            userModel.findOneAndUpdate({ fullName: userFullName, number: userNumber }, { $push: { bills: billData._id } })
            res.json(billData);
        }
        else {
            res.json('None');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

})



// Twilio credentials
var accountSid = process.env.ACCOUNTSID;
var authToken = process.env.AUTHTOKEN;
var twilioNumber = process.env.TWILIONUMBER;
const serviceSid = process.env.SERVICESID;

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});


const client = require('twilio')(accountSid, authToken);

const adminAuth = express.Router();

// signup api
adminAuth.post("/admin/signup", async (req, res) => {
    try {
        const { fullName, number, password } = req.body;
        const existingUser = await adminModel.findOne({ number: number });
        if (existingUser) return res.status(400).json({ msg: "User with same number already exist!" });
        const hashedPassword = await bcryptjs.hash(password, 8);

        let user = new adminModel({
            fullName,
            number,
            password: hashedPassword
        });

        user = await user.save();
        const token = jwt.sign({ id: user._id }, adminKey);
        res.json({ ...user._doc, token: token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// login api
adminAuth.post("/admin/login", async (req, res) => {
    try {
        const { number, password } = req.body;
        const existingUser = await adminModel.findOne({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        const isMatch = await bcryptjs.compare(password, existingUser.password);
        if (!isMatch) return res.status(400).json({ msg: "Incorrect Password" });

        const token = jwt.sign({ id: existingUser._id }, adminKey);
        res.json({ ...existingUser._doc, token: token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// forgot password number sending api
adminAuth.post("/admin/forgotPasswordNumber", async (req, res) => {
    try {
        const { number } = req.body;
        const existingUser = await adminModel.findOne({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        let randomNumber = Math.floor(1000 + Math.random() * 9000);
        client.messages.create({
            body: `Your OTP is ${randomNumber}`,
            messagingServiceSid: serviceSid,
            to: number
        }).then(message => {
            adminModel.findByIdAndUpdate(existingUser._id, { $set: { otp: randomNumber } }, { new: true }, (err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json({ ...result._doc });
            })
        }).done();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// forgot password OTP send
adminAuth.post("/admin/sendotp", async (req, res) => {
    try {
        const { otp, number } = req.body;
        const existingUser = await adminModel.findOne({ number: number });
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        if (otp === existingUser.otp) {
            res.json({ ...existingUser._id });
        }
        else {
            res.status(400).json({ msg: "Invalid OTP" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// change password api
adminAuth.post("/admin/changePassword", async (req, res) => {
    try {
        const { password, userId } = req.body;
        const hashedPassword = await bcryptjs.hash(password, 8);
        adminModel.findByIdAndUpdate(userId, { $set: { password: hashedPassword } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ message: err.message });
            res.json({ ...result._doc });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// dashboard api - show register user data
adminAuth.get("/admin/dashboardUserData/:adminId", async (req, res) => {
    try {
        const { offset } = req.query.offset;
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        const allUsers = await userModel.find();
        let userList = allUsers.slice(offset, offset + 20);


        const data = {
            userList: userList,
            totalUsers: allUsers.length,
            totalOrders: existingUser.orders.length,
            totalEnquiry: existingUser.enquiry.length
        }

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// send back enquiry api
adminAuth.post("/admin/sendEnquiry/:adminId/:id", upload.single("enquiryImage"), async (req, res) => {
    try {
        const enquiryId = req.params.id;
        const adminId = req.params.adminId;


        const { enquiryMsg, enquiryDate } = req.body;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });

        cloudinary.uploader.upload_stream({ folder: `${adminId}/enquiryImages` }, (error, result) => {
            if (error) return res.status(400).json({ error: error.message });

            const adminEnquiryData = {
                adminId: adminId,
                enquiry: enquiryMsg,
                image: result.url,
                enquiryDate: enquiryDate
            }

            enquiryModel.findByIdAndUpdate(enquiryId, { $set: { admin: adminEnquiryData } }, { new: true }, (err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                adminModel.findByIdAndUpdate(req.user, { $push: { enquiry: result._id } }, { new: true }, (err, result) => {
                    if (err) return res.status(400).json({ msg: err.message });
                    enquiryModel.find().exec((err, result) => {
                        if (err) return res.status(400).json({ msg: err.message });
                        res.json(result);
                    });
                });
            });
        }).end(req.file.buffer);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// dashboard api - show orders data
adminAuth.get("/admin/dashboardOrderData/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const { offset } = req.query.offset;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        const allUsers = await userModel.find();
        const allOrders = await orderModel.find();
        let orderList = allOrders.slice(offset, offset + 20);


        const data = {
            orderList: orderList,
            totalUsers: allUsers.length,
            totalOrders: existingUser.orders.length,
            totalEnquiry: existingUser.enquiry.length
        }

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// dashboard api - show enquiry data
adminAuth.get("/admin/dashboardEnquiryData/:adminId", async (req, res) => {
    try {
        const { offset } = req.query.offset;
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });
        const allUsers = await userModel.find();
        const enquiryList = existingUser.enquiry.slice(offset, offset + 20);


        const data = {
            enquiryList: enquiryList,
            totalUsers: allUsers.length,
            totalOrders: existingUser.orders.length,
            totalEnquiry: existingUser.enquiry.length
        }

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// usermanagement api
adminAuth.get("/admin/userManagement/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        userModel.find().exec((err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            res.json(result);
        })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Edit User details - User Management
adminAuth.post("/admin/editUser/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const { fullName, number, email, password, zipCode, city, state, businessType, userId } = req.body;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status.json({ msg: "User not found!" });

        const hashedPassword = await bcryptjs.hash(password, 8);

        userModel.findByIdAndUpdate(userId, { $set: { fullName, number, email, password: hashedPassword, zipCode, city, state, businessType } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            userModel.find().exec((err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            })
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete User - User Management
adminAuth.post("/admin/delete/user/:adminId", async (req, res) => {
    try {
        const { userId } = req.body;
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status.json({ msg: "User not found!" });
        userModel.findByIdAndDelete(userId).exec((err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            userModel.find().exec((err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add User - User Management
adminAuth.post("/admin/addUser/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const { fullName, number, email, password, zipCode, city, state, businessType, userId } = req.body;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status.json({ msg: "User not found!" });

        const hashedPassword = await bcryptjs.hash(password, 8);

        userModel.findByIdAndUpdate(userId, { $set: { fullName, number, email, password: hashedPassword, zipCode, city, state, businessType } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            userModel.find().exec((err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            })
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Order Status - Orders Section
adminAuth.post("/admin/updateOrderStatus/:orderId/:adminId", async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const adminId = req.params.adminId;
        const orderId = req.params.orderId;
        const existingUser = await adminModel.findById(req.user);
        if (!existingUser) return res.status.json({ msg: "User not found!" });
        orderModel.findByIdAndUpdate(orderId, { $set: { status: orderStatus } }, { new: true }, (err, result) => {
            if (err) return res.status.json({ msg: err.message });
            orderModel.find().exec((err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Upload Stock data 
adminAuth.post("/admin/uploadStock/:adminId", async (req, res) => {
    try {

        // we want fields in array [] and allData in object like {} => {thickness: "10mm", length: "20cm"} like this

        const adminId = req.params.adminId;
        const { state, stockName, businessType, fields, allData, stockDate } = req.body;

        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "No user found" });

        let stock = new stockModel({
            stateName: state,
            stockName: stockName,
            businessType: businessType,
            stockDate: stockDate,
            fields: fields,
            allData: allData,
        });

        stock = await stock.save();

        adminModel.findByIdAndUpdate(adminId, { $set: { stock: stock._id } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            res.json(result);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit stock 
adminAuth.post("/admin/editStock/:stockId/:adminId", async (req, res) => {
    try {

        // we want fields in array [] and allData in object like {} => {thickness: "10mm", length: "20cm"} like this
        const adminId = req.params.adminId;
        const { state, stockName, businessType, stockDate, fields, allData } = req.body;
        const stockId = req.params.stockId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: err.message });

        stockModel.findByIdAndUpdate(stockId, { $set: { stateName: state, stockName: stockName, businessType: businessType, stockDate: stockDate, fields: fields, allData } }, { new: true }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            res.json(result);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Stock
adminAuth.post("/admin/deleteStock/:stockId/:adminId", async (req, res) => {
    try {
        const stockId = req.params.stockId;
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found!" });

        stockModel.findByIdAndDelete(stockId, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            adminModel.findByIdAndUpdate(adminId, { $pull: { stock: stockId } }, { new: true }, (err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                stockModel.find().exec((err, result) => {
                    if (err) return res.status(400).json({ msg: err.message });
                    res.json(result);
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Get all Orders
adminAuth.get("/admin/getAllOrders/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const { offset } = req.query.offset;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        allOrders = await orderModel.find();

        let orderList = allOrders.slice(offset, offset + 20);

        res.json(orderList);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Show all the payments
adminAuth.get("/admin/showAllPayment/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        paymentModel.find().exec((err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            res.json(result);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add payment
adminAuth.post("/admin/addPayment/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const { paymentDate, paymentTime, fullName, number, productName, netPrice, orderQuantity, totalOutstandingPayment, totalPaidAmount, orderNumber } = req.body;
        let orderData = {};
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });

        let paymentData = new paymentModel({
            paymentDate: paymentDate,
            paymentTime: paymentTime,
            fullName: fullName,
            number: number,
            productName: productName,
            netPrice: netPrice,
            orderQuantity: orderQuantity,
            totalOutstandingPayment: totalOutstandingPayment,
            totalPaidAmount: totalPaidAmount,
            orderNumber: orderNumber
        });

        paymentData = await paymentData.save();



        await adminModel.findByIdAndUpdate(adminId, { $push: { payment: paymentData._id } });

        await userModel.find({ fullName: fullName, number: number }, { $push: { transactions: paymentData._id, receipts: paymentData._id } });

        if (totalOutstandingPayment === totalPaidAmount) {
            orderData = await orderModel.findOne({ orderNumber: orderNumber });

            let billData = new billModel({
                fullName: orderData.fullName,
                productName: orderData.productName,
                orderQuantity: orderData.orderQuantity,
                totalAmount: orderData.orderAmount,
                billDate: new Date().toISOString(),
                orderNumber: orderData.orderNumber
            });

            billData = await billModel.save();

            await userModel.findOneAndUpdate({ fullName: fullName, number: number }, { $push: { bills: billData._id } });

            adminModel.findById(adminId).populate("payment").exec((err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            });

        }
        else {
            adminModel.findById(adminId).populate("payment").exec((err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Show all bills
adminAuth.get("/admin/showAllBills/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });
        billModel.find().exec((err, result) => {
            if (err) return res.status(400).json({ msg: err.message });
            res.json(result);
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Week data - Graph
adminAuth.get("/admin/getWeekData/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });

        let curr = new Date
        let week = []
        let weekData = [];

        for (let i = 1; i <= 7; i++) {
            let first = curr.getDate() - curr.getDay() + i
            let day = new Date(curr.setDate(first)).toISOString().slice(0, 10)
            week.push(day)
        }

        week.forEach(async (element) => {
            const orderDay = await orderModel.find({ date: element });
            let totalAmount = 0;
            orderDay.forEach((e) => {
                totalAmount = totalAmount + e.orderAmount;
            }).then((result) => {
                weekData.push({ element: totalAmount });
            }).catch((err) => {
                res.status(400).json({ msg: err.message });
            });


        }).then((result) => {
            res.json(weekData);
        }).catch((err) => {
            res.status(400).json({ msg: err.message });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Month Data - Graph
adminAuth.get("/admin/getMonthData/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });

        const currMonth = new Date().toDateString().split(" ")[1];
        const currYear = new Date().toDateString().split(" ")[3];

        let monthDays = []
        let monthData = [];

        var datee = new Date(currYear, currMonth, 1);

        while (datee.getMonth() === month) {
            monthDays.push(new Date(datee));
            datee.setDate(datee.getDate() + 1);
        }


        monthDays.forEach(async (element) => {
            let day = new Date(element).toISOString().slice(0, 10)
            const orderDay = await orderModel.find({ date: day });
            let totalAmount = 0;
            orderDay.forEach((e) => {
                totalAmount = totalAmount + e.orderAmount;
            }).then((result) => {
                monthData.push({ element: totalAmount });
            }).catch((err) => {
                res.status(400).json({ msg: err.message });
            });


        }).then((result) => {
            res.json(monthData);
        }).catch((err) => {
            res.status(400).json({ msg: err.message });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Year data - Graph
adminAuth.get("/admin/getYearData/:adminId", async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const existingUser = await adminModel.findById(adminId);
        if (!existingUser) return res.status(400).json({ msg: "User not found" });

        const currYear = new Date().toDateString().split(" ")[3];

        const orderList = await orderModel.find();
        let yearData = [];
        let janData = 0;
        let febData = 0;
        let marData = 0;
        let aprData = 0;
        let mayData = 0;
        let junData = 0;
        let julData = 0;
        let augData = 0;
        let sepData = 0;
        let octData = 0;
        let novData = 0;
        let decData = 0;
        orderList.forEach(element => {
            const orderMonth = new Date(element.date).toDateString().split(" ")[1];
            const orderYear = new Date(element.date).toDateString().split(" ")[3];
            if (orderYear === currYear) {
                if (orderMonth === "Jan") {
                    janData += 1;
                } else if (orderMonth === "Feb") {
                    febData += 1;

                } else if (orderMonth === "Mar") {
                    marData += 1;

                } else if (orderMonth === "Apr") {
                    aprData += 1;

                } else if (orderMonth === "May") {
                    mayData += 1;

                } else if (orderMonth === "Jun") {
                    junData += 1;

                } else if (orderMonth === "Jul") {
                    julData += 1;

                } else if (orderMonth === "Aug") {
                    augData += 1;

                } else if (orderMonth === "Sep") {
                    sepData += 1;

                } else if (orderMonth === "Oct") {
                    octData += 1;

                } else if (orderMonth === "Nov") {
                    novData += 1;

                } else {
                    decData += 1;
                }
            }

        });

        res.json({
            janData, febData, marData, aprData, mayData, junData, julData, augData, sepData, octData, novData, decData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Advertisement api
adminAuth.post("/admin/addAdvertisement/:adminId", upload.single("advertisementImage"), async (req, res) => {
    try {
        const { url } = req.body;
        const adminId = req.params.adminId;



        cloudinary.uploader.upload_stream({ folder: `${adminId}/advertisementImages` }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });

            const advertisementData = {
                image: result.url,
                url: url
            };
            adminModel.findByIdAndUpdate(adminId, { $push: { advertisement: advertisementData } }, { new: true }, (err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            });
        }).end(req.file.buffer);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Profile api
adminAuth.post("/admin/editProfile/:adminId", upload.single("profilePic"), async (req, res) => {
    try {
        const adminId = req.params.adminId;
        const { fullName, number } = req.body;

        cloudinary.uploader.upload_stream({ folder: `${adminId}/ProfilePic` }, (err, result) => {
            if (err) return res.status(400).json({ msg: err.message });

            adminModel.findByIdAndUpdate(adminId, { $set: { fullName: fullName, number: number, profilePic: result.url } }, { new: true }, (err, result) => {
                if (err) return res.status(400).json({ msg: err.message });
                res.json(result);
            })
        }).end(req.file.buffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = adminAuth;