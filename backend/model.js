import mongoose from "mongoose";

const SigninSchema = mongoose.Schema({
    username:{
        type:String,
        require:true
    },
    email:{
        type:String,
        require:true
    },
    password:{
        type:String,
        require:true
    },
    signupInterest:{
        type:String,
        require:true
    },
    suggestionCategoriesGroup:{
        type:String,
        require:true
    }
})

export const signupSchema = mongoose.model('SigninFrom',SigninSchema);