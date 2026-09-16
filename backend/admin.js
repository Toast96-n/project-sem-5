// ======================================================
// seedAdmin.js
// Create the first admin account
//
// Run:
// node seedAdmin.js <username> <email> <password>
//
// Example:
// node seedAdmin.js niv niv@gmail.com NivAdmin123
// ======================================================

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Admin } from "./models.js";


// ======================================================
// GET COMMAND LINE ARGUMENTS
// ======================================================

const [, , username, email, password] = process.argv;


// ======================================================
// CHECK ARGUMENTS
// ======================================================

if (!username || !email || !password) {

    console.log("");
    console.log("==========================================");
    console.log("        ADMIN CREATION");
    console.log("==========================================");
    console.log("");

    console.log(
        "Usage: node seedAdmin.js <username> <email> <password>"
    );

    console.log("");

    console.log(
        "Example: node seedAdmin.js niv niv@gmail.com NivAdmin123"
    );

    console.log("");

    process.exit(1);
}


// ======================================================
// CREATE ADMIN
// ======================================================

async function createAdmin() {

    try {

        // ------------------------------------------------
        // CONNECT TO MONGODB
        // ------------------------------------------------

        await mongoose.connect(
            "mongodb://localhost:27017/ProductSuggestion"
        );

        console.log("");
        console.log("Connected to MongoDB");


        // ------------------------------------------------
        // CHECK IF ADMIN ALREADY EXISTS
        // ------------------------------------------------

        const existingAdmin = await Admin.findOne({
            username: username
        });


        if (existingAdmin) {

            console.log("");
            console.log(
                `Admin "${username}" already exists.`
            );

            console.log("");

            await mongoose.disconnect();

            process.exit(0);
        }


        // ------------------------------------------------
        // HASH PASSWORD
        // ------------------------------------------------

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );


        // ------------------------------------------------
        // CREATE ADMIN
        // ------------------------------------------------

        const admin = await Admin.create({

            username: username,

            email: email,

            password: hashedPassword

        });


        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        console.log("");
        console.log("==========================================");
        console.log("        ADMIN CREATED SUCCESSFULLY");
        console.log("==========================================");

        console.log("");

        console.log("Admin ID :", admin._id);
        console.log("Username :", username);
        console.log("Email    :", email);

        console.log("");

        console.log(
            "You can now login from the Admin Login panel."
        );

        console.log("");

        console.log("==========================================");


        // ------------------------------------------------
        // DISCONNECT
        // ------------------------------------------------

        await mongoose.disconnect();

        process.exit(0);

    } catch (error) {

        console.error("");
        console.error("==========================================");
        console.error("        ADMIN CREATION FAILED");
        console.error("==========================================");

        console.error("");

        console.error(error);

        console.error("");

        await mongoose.disconnect();

        process.exit(1);
    }
}


// ======================================================
// RUN
// ======================================================

createAdmin();