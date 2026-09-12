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

const Tokenverify = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'SigninFrom',
        require:true
    },

    hashToken:{
        type:String,
        require:true
    },

    exprireAt:{
        type:Date,
        require:true
    }
})

Tokenverify.index(
    {exprireAt:1},
    {expireAfterSeconds:0}
)

export const signupSchema = mongoose.model('SigninFrom',SigninSchema);

export const hashpasstoken = mongoose.model('HashPassToken' , Tokenverify);